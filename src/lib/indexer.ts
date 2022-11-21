import { WritableStreamBuffer } from "stream-buffers";

import { WARCParser } from "./warcparser";
import { WARCRecord } from "./warcrecord";
import { postToGetUrl, getSurt } from "./utils";
import { IndexCommandArgs, CdxIndexCommandArgs } from "../commands";
import { StreamResults, Request } from "./types";

const DEFAULT_FIELDS = ["offset", "warc-type", "warc-target-uri"];
// ===========================================================================
abstract class BaseIndexer {
  opts: Partial<IndexCommandArgs>;
  out: WritableStreamBuffer | NodeJS.WriteStream;
  fields: string[];
  parseHttp: boolean;

  constructor(
    opts: Partial<IndexCommandArgs> = {},
    out: WritableStreamBuffer | NodeJS.WriteStream = process.stdout
  ) {
    this.opts = opts;
    this.out = out;
    this.fields = opts && opts.fields ? opts.fields.split(",") : DEFAULT_FIELDS;
    this.parseHttp = false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serialize(result: Record<string, any>) {
    return JSON.stringify(result) + "\n";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  write(result: Record<string, any>) {
    // @ts-expect-error incompatible function signatures are actually the same
    this.out.write(this.serialize(result));
  }

  async run(files: StreamResults) {
    for await (const result of this.iterIndex(files)) {
      this.write(result);
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
    parser: WARCParser,
    filename: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Record<string, any> | null {
    if (this.filterRecord && !this.filterRecord(record)) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {};

    const offset = parser.offset;
    const length = parser.recordLength;

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

  getField(field: string, record: WARCRecord) {
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
        return record.httpHeaders.headers.get(field.slice(5));
      }
      return null;
    }

    return record.warcHeaders.headers.get(field) || null;
  }
}

// ===========================================================================
export class Indexer extends BaseIndexer {
  constructor(
    opts?: Partial<IndexCommandArgs>,
    out?: WritableStreamBuffer | NodeJS.WriteStream
  ) {
    super(opts, out);

    for (const field of this.fields) {
      if (field.startsWith("http:")) {
        this.parseHttp = true;
        break;
      }
    }
  }
}

// ===========================================================================
const DEFAULT_CDX_FIELDS =
  "urlkey,timestamp,url,mime,status,digest,length,offset,filename".split(",");
const DEFAULT_LEGACY_CDX_FIELDS =
  "urlkey,timestamp,url,mime,status,digest,redirect,meta,length,offset,filename".split(
    ","
  );

// ===========================================================================
export class CDXIndexer extends Indexer {
  includeAll: boolean;
  noSurt: boolean;
  _lastRecord: WARCRecord | null;

  constructor(
    opts?: Partial<CdxIndexCommandArgs>,
    out?: WritableStreamBuffer | NodeJS.WriteStream
  ) {
    super(opts as unknown as IndexCommandArgs, out);
    this.includeAll = Boolean(opts?.all);
    this.fields = DEFAULT_CDX_FIELDS;
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

    return true;
  }

  override indexRecord(
    record: WARCRecord | null,
    parser: WARCParser,
    filename: string
  ) {
    if (this.includeAll) {
      if (!record) {
        return null;
      }
      return super.indexRecord(record, parser, filename);
    }

    const lastRecord = this._lastRecord;

    if (record) {
      record._offset = parser.offset;
      record._length = parser.recordLength;
    }

    if (!lastRecord) {
      this._lastRecord = record;
      return null;
    }

    if (!record || lastRecord.warcTargetURI != record.warcTargetURI) {
      this._lastRecord = record;
      return this.indexRecordPair(lastRecord, null, parser, filename);
    }

    if (record.warcType === "request" && lastRecord.warcType === "response") {
      this._lastRecord = null;
      return this.indexRecordPair(lastRecord, record, parser, filename);
    } else if (
      record.warcType === "response" &&
      lastRecord.warcType === "request"
    ) {
      this._lastRecord = null;
      return this.indexRecordPair(record, lastRecord, parser, filename);
    } else {
      this._lastRecord = record;
      return this.indexRecordPair(lastRecord, null, parser, filename);
    }
  }

  indexRecordPair(
    record: WARCRecord,
    reqRecord: WARCRecord | null,
    parser: WARCParser,
    filename: string
  ) {
    let method;
    let requestBody;
    let url = record.warcTargetURI || "";

    if (
      reqRecord &&
      reqRecord.httpHeaders &&
      reqRecord.httpHeaders.method !== "GET"
    ) {
      const request: Request = {
        url,
        method: reqRecord.httpHeaders.method,
        headers: reqRecord.httpHeaders.headers,
        postData: reqRecord.payload,
      };

      method = request.method;

      if (postToGetUrl(request)) {
        requestBody = request.requestBody;
        record.method = method;
        record.requestBody = requestBody;
        url = request.url;
      }
    }

    record._urlkey = url;

    const res = super.indexRecord(record, parser, filename);
    if (res) {
      if (record && record._offset !== undefined) {
        res["offset"] = record._offset;
        res["length"] = record._length;
      }
      if (method) {
        res["method"] = method;
      }
      if (requestBody) {
        res["requestBody"] = requestBody;
      }
    }

    return res;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serializeCDXJ(result: Record<string, any>) {
    const { urlkey, timestamp } = result;
    delete result["urlkey"];
    delete result["timestamp"];

    return `${urlkey} ${timestamp} ${JSON.stringify(result)}\n`;
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
            field = "content-type";
        }
        value = super.getField(field, record);
        return value ? value.toString().split(";", 1)[0]?.trim() : null;

      case "status":
        return super.getField("http:status", record);

      case "digest":
        value = record.warcPayloadDigest;
        return value ? value.split(":", 2)[1] : null;

      default:
        return null;
    }
  }
}
