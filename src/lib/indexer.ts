import { type WritableStreamBuffer } from "stream-buffers";

import { WARCParser } from "./warcparser";
import { type WARCRecord } from "./warcrecord";
import { postToGetUrl, getSurt } from "./utils";
import { type IndexCommandArgs, type CdxIndexCommandArgs } from "../commands";
import {
  type StreamResults,
  type Request,
  type IndexerOffsetLength,
} from "./types";

export const DEFAULT_FIELDS = ["offset", "warc-type", "warc-target-uri"];

// ===========================================================================
abstract class BaseIndexer {
  opts: Partial<IndexCommandArgs>;
  fields: string[];
  reqFields: string[];
  parseHttp: boolean;

  constructor(
    opts: Partial<IndexCommandArgs> = {},
    defaultFields: string[] = DEFAULT_FIELDS,
  ) {
    this.opts = opts;
    if (opts.fields) {
      this.fields = opts.fields;
      this.reqFields = this.fields.filter((x) => isRequestHeader(x));
    } else {
      this.fields = defaultFields;
      this.reqFields = [];
    }
    this.parseHttp = false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serialize(result: Record<string, any>) {
    return JSON.stringify(result) + "\n";
  }

  write(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: Record<string, any>,
    out: WritableStreamBuffer | NodeJS.WriteStream,
  ) {
    // @ts-expect-error incompatible function signatures are actually the same
    out.write(this.serialize(result));
  }

  async writeAll(
    files: StreamResults,
    out: WritableStreamBuffer | NodeJS.WriteStream,
  ) {
    for await (const result of this.iterIndex(files)) {
      this.write(result, out);
    }
  }

  async *iterIndex(files: StreamResults) {
    const params = { strictHeaders: true, parseHttp: this.parseHttp };

    for (const { filename, reader } of files) {
      const parser = new WARCParser(reader, params);

      yield* this.iterRecords(parser, filename);
    }
  }

  async *iterRecords(parser: WARCParser, filename: string) {
    for await (const record of parser) {
      await record.skipFully();
      const result = this.indexRecord(record, parser, filename);
      if (result) {
        yield result;
      }
    }
  }

  filterRecord?(record: WARCRecord): boolean;

  indexRecord(
    record: WARCRecord,
    indexerOffset: IndexerOffsetLength,
    filename: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Record<string, any> | null {
    if (this.filterRecord && !this.filterRecord(record)) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {};

    const { offset, recordLength: length } = indexerOffset;

    const special = { offset, length, filename };

    for (const field of this.fields) {
      if (field in special) {
        result[field] = special[field as keyof typeof special];
      } else {
        this.setField(field, record, result);
      }
    }

    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setField(field: string, record: WARCRecord, result: Record<string, any>) {
    const value = this.getField(field, record);
    if (value !== null) {
      result[field] = value;
    }
  }

  getField(
    field: string,
    record: WARCRecord,
  ): string | number | null | undefined {
    // only handle req. fields for 'request' records
    if (field.startsWith("req.")) {
      if (record.warcType === "request") {
        field = field.slice(4);
      } else {
        return null;
      }
    }

    if (field === "http:status") {
      if (
        record.httpHeaders &&
        (record.warcType === "response" || record.warcType === "revisit")
      ) {
        return record.httpHeaders.statusCode;
      }
      return null;
    }

    if (field.startsWith("http:")) {
      if (record.httpHeaders) {
        const headers: Headers | Map<string, string> = record.httpHeaders.headers;
        const name = field.slice(5);
        let value = headers.get(name);
        // just do lower-case search to avoid conversion in case there may be errors
        if (headers instanceof Map) {
          const nameLower = name.toLowerCase();
          for (const keyName of headers.keys()) {
            if (nameLower === keyName.toLowerCase()) {
              value = headers.get(keyName);
            }
          }
        }
        return value;
      }
      return null;
    }

    return record.warcHeaders.headers.get(field) || null;
  }
}

// ===========================================================================
export class Indexer extends BaseIndexer {
  constructor(opts?: Partial<IndexCommandArgs>, defaultFields?: string[]) {
    super(opts, defaultFields);

    for (const field of this.fields) {
      if (field.startsWith("http:")) {
        this.parseHttp = true;
        break;
      }
    }
  }
}

// ===========================================================================
export const DEFAULT_CDX_FIELDS =
  "urlkey,timestamp,url,mime,status,digest,length,offset,filename".split(",");
export const DEFAULT_LEGACY_CDX_FIELDS =
  "urlkey,timestamp,url,mime,status,digest,redirect,meta,length,offset,filename".split(
    ",",
  );

// ===========================================================================
export interface CDXAndRecord {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cdx: Record<string, any>;
  record: WARCRecord;
  reqRecord: WARCRecord | null;
}

// ===========================================================================
export class CDXIndexer extends Indexer {
  includeAll: boolean;
  overrideIndexForAll: boolean;
  noSurt: boolean;
  _lastRecord: WARCRecord | null;

  constructor(opts?: Partial<CdxIndexCommandArgs>) {
    super(opts, DEFAULT_CDX_FIELDS);
    this.includeAll = Boolean(opts?.all);
    this.overrideIndexForAll = Boolean(opts?.all);
    this.parseHttp = true;
    this.noSurt = Boolean(opts?.noSurt);
    this._lastRecord = null;

    switch (opts?.format) {
      case "cdxj":
        this.serialize = this.serializeCDXJ;
        break;

      case "cdx":
        this.serialize = this.serializeCDX11;
        break;

      case "json":
      default:
        // default write
        break;
    }
  }

  override async *iterRecords(parser: WARCParser, filename: string) {
    this._lastRecord = null;

    for await (const record of parser) {
      await record.readFully();

      const result = this.indexRecord(record, parser, filename);
      if (result) {
        yield result;
      }
    }

    const result = this.indexRecord(null, parser, filename);
    if (result) {
      yield result;
    }
  }

  override filterRecord(record: WARCRecord) {
    if (this.includeAll) {
      return true;
    }

    const type = record.warcType;
    if (type === "request" || type === "warcinfo") {
      return false;
    }

    if (type === "metadata" || type === "resource") {
      if (record.warcContentType === "application/warc-fields") {
        return false;
      }
    }

    return true;
  }

  override indexRecord(
    record: WARCRecord | null,
    indexOffset: IndexerOffsetLength,
    filename: string,
  ) {
    if (this.overrideIndexForAll) {
      if (!record) {
        return null;
      }
      return super.indexRecord(record, indexOffset, filename);
    }

    const lastRecord = this._lastRecord;
    this._lastRecord = record;

    if (record) {
      record._offset = indexOffset.offset;
      record._length = indexOffset.recordLength;
    }

    if (!lastRecord) {
      return null;
    }

    if (!record || lastRecord.warcTargetURI != record.warcTargetURI) {
      return this.indexRecordPair(lastRecord, null, indexOffset, filename);
    }

    const warcType = record.warcType;
    const lastWarcType = lastRecord.warcType;

    if (
      warcType === "request" &&
      (lastWarcType === "response" || lastWarcType === "revisit")
    ) {
      this._lastRecord = null;
      return this.indexRecordPair(lastRecord, record, indexOffset, filename);
    } else if (
      (warcType === "response" || warcType === "revisit") &&
      lastWarcType === "request"
    ) {
      this._lastRecord = null;
      return this.indexRecordPair(record, lastRecord, indexOffset, filename);
    } else {
      return this.indexRecordPair(lastRecord, null, indexOffset, filename);
    }
  }

  indexRecordPair(
    record: WARCRecord,
    reqRecord: WARCRecord | null,
    indexOffset: IndexerOffsetLength,
    filename: string,
  ) {
    let method;
    let requestBody;
    let url = record.warcTargetURI || "";

    if (reqRecord?.httpHeaders && reqRecord.httpHeaders.method !== "GET") {
      const request: Request = {
        url,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        method: reqRecord.httpHeaders.method!,
        headers: reqRecord.httpHeaders.headers,
        postData: reqRecord.payload,
      };

      method = request.method;

      if (postToGetUrl(request)) {
        requestBody = request.requestBody;
        url = request.url;
      }
    }

    record._urlkey = url;

    const res = super.indexRecord(record, indexOffset, filename);
    if (res) {
      if (record._offset !== undefined) {
        res["offset"] = record._offset;
        res["length"] = record._length;
      }
      if (method) {
        res["method"] = method;
      }
      if (requestBody) {
        res["requestBody"] = requestBody;
      }

      if (reqRecord && this.reqFields.length) {
        for (const field of this.reqFields) {
          this.setField(field, reqRecord, res);
        }
      }
    }

    return res;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serializeCDXJ(result: Record<string, any>) {
    const { urlkey, timestamp } = result;
    delete result["urlkey"];
    delete result["timestamp"];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const replacer = (key: string, value: any): any => {
      if (["offset", "length", "status"].includes(key)) {
        return value === null || value === undefined ? "" : "" + value;
      }
      return value;
    };

    return `${urlkey} ${timestamp} ${JSON.stringify(result, replacer)}\n`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serializeCDX11(result: Record<string, any>) {
    const value = [];

    for (const field of DEFAULT_LEGACY_CDX_FIELDS) {
      value.push(result[field] != undefined ? result[field] : "-");
    }

    return value.join(" ") + "\n";
  }

  override getField(field: string, record: WARCRecord) {
    let value = null;

    switch (field) {
      case "urlkey":
        value = record._urlkey || record.warcTargetURI || null;
        return this.noSurt || value === null ? value : getSurt(value);

      case "timestamp":
        value = record.warcDate ?? "";
        return value.replace(/[-:T]/g, "").slice(0, 14);

      case "url":
        return record.warcTargetURI;

      case "mime":
        switch (record.warcType) {
          case "revisit":
            return "warc/revisit";

          case "response":
          case "request":
            field = "http:content-type";
            break;

          default:
            return record.warcContentType;
        }
        value = super.getField(field, record);
        return value ? value.toString().split(";", 1)[0]?.trim() : null;

      case "status":
        return super.getField("http:status", record);

      case "referrer":
        return super.getField("req.http:referer", record);

      case "digest":
        value = record.warcPayloadDigest;
        return value ? value.split(":", 2)[1] : null;

      default:
        return super.getField(field, record);
    }
  }
}

// ===========================================================================
export class CDXAndRecordIndexer extends CDXIndexer {
  constructor(opts?: Partial<CdxIndexCommandArgs>) {
    super(opts);
    this.overrideIndexForAll = false;
  }

  override indexRecordPair(
    record: WARCRecord,
    reqRecord: WARCRecord | null,
    indexOffset: IndexerOffsetLength,
    filename: string,
  ): CDXAndRecord | null {
    const cdx = super.indexRecordPair(record, reqRecord, indexOffset, filename);
    return cdx && { cdx, record, reqRecord };
  }
}

export function isRequestHeader(header: string) {
  return header.startsWith("req.") || header.toLowerCase() === "referrer";
}
