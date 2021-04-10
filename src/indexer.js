import { WARCParser } from "./warcparser";

const DEFAULT_FIELDS = "offset,warc-type,warc-target-uri".split(",");

import { postToGetUrl, getSurt } from "./utils";


// ===========================================================================
class BaseIndexer
{
  constructor(opts, out) {
    this.opts = opts;
    this.out = out;
  }

  serialize(result) {
    return JSON.stringify(result) + "\n";
  }

  write(result) {
    this.out.write(this.serialize(result));
  }

  async run(files) {
    for await (const result of this.iterIndex(files)) {
      this.write(result);
    }
  }

  async* iterIndex(files) {
    const params = {strictHeaders: true, parseHttp: this.parseHttp};

    for (const { filename, reader } of files) {
      if (!filename || !reader) {
        continue;
      }

      const parser = new WARCParser(reader, params);

      yield* this.iterRecords(parser, filename);
    }
  }

  async* iterRecords(parser, filename) {
    for await (const record of parser) {
      await record.skipFully();
      const result = this.indexRecord(record, parser, filename);
      if (result) {
        yield result;
      }
    }
  }

  indexRecord(record, parser, filename) {
    if (this.filterRecord && !this.filterRecord(record)) {
      return null;
    }

    const result = {};

    const offset = parser.offset;
    const length = parser.recordLength;

    const special = {offset, length, filename};

    for (const field of this.fields) {
      if (special[field] != undefined) {
        result[field] = special[field];
      } else {
        this.setField(field, record, result);
      }
    }

    return result;
  }

  setField(field, record, result) {
    const value = this.getField(field, record);
    if (value != null) {
      result[field] = value;
    }
  }

  getField(field, record) {
    if (field === "http:status") {
      if (record.httpHeaders && (record.warcType === "response" || record.warcType === "revisit")) {
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

    return record.warcHeaders.headers.get(field);
  }
}


// ===========================================================================
class Indexer extends BaseIndexer
{
  constructor(opts = {}, out = null) {
    super(opts, out);

    if (!opts.fields) {
      this.fields = DEFAULT_FIELDS;
      this.parseHttp = false;
    } else {
      this.fields = opts.fields.split(",");
      this.parseHttp = false;

      for (const field of this.fields) {
        if (field.startsWith("http:")) {
          this.parseHttp = true;
          break;
        }
      }
    }
  }
}


// ===========================================================================
const DEFAULT_CDX_FIELDS = "urlkey,timestamp,url,mime,status,digest,length,offset,filename".split(",");
const DEFAULT_LEGACY_CDX_FIELDS = "urlkey,timestamp,url,mime,status,digest,redirect,meta,length,offset,filename".split(",");


// ===========================================================================
class CDXIndexer extends Indexer
{
  constructor(opts = {}, out = null) {
    super(opts, out);
    this.includeAll = opts.all;
    this.fields = DEFAULT_CDX_FIELDS;
    this.parseHttp = true;
    this.noSurt = !!opts.noSurt;
    this._lastRecord = null;

    switch (opts.format) {
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

  async* iterRecords(parser, filename) {
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

  filterRecord(record) {
    if (this.includeAll) {
      return true;
    }

    const type = record.warcType;
    if (type === "request" || type === "warcinfo") {
      return false;
    }

    return true;
  }

  indexRecord(record, parser, filename) {
    if (this.includeAll) {
      if (!record) {
        return;
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
    } else if (record.warcType === "response" && lastRecord.warcType === "request") {
      this._lastRecord = null;
      return this.indexRecordPair(record, lastRecord, parser, filename);
    } else {
      this._lastRecord = record;
      return this.indexRecordPair(lastRecord, null, parser, filename);
    }
  }

  indexRecordPair(record, reqRecord, parser, filename) {
    let method;
    let requestBody;
    let url = record.warcTargetURI;

    if (reqRecord && reqRecord.httpHeaders.method !== "GET") {
      const request = {
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
    if (res && record && record._offset !== undefined) {
      res.offset = record._offset;
      res.length = record._length;
    }
    if (method) {
      res.method = method;
    }
    if (requestBody) {
      res.requestBody = requestBody;
    }

    return res;
  }

  serializeCDXJ(result) {
    const { urlkey, timestamp } = result;
    delete result.urlkey;
    delete result.timestamp;

    return `${urlkey} ${timestamp} ${JSON.stringify(result)}\n`;
  }

  serializeCDX11(result) {
    const value = [];

    for (const field of DEFAULT_LEGACY_CDX_FIELDS) {
      value.push(result[field] != undefined ? result[field] : "-");
    }

    return value.join(" ") + "\n";
  }

  getField(field, record) {
    let value = null;

    switch (field) {
    case "urlkey":
      value = record._urlkey ? record._urlkey : record.warcTargetURI;
      return this.noSurt ? value : getSurt(value);

    case "timestamp":
      value = record.warcDate;
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
      return value ? value.split(";", 1)[0].trim() : null;

    case "status":
      return super.getField("http:status", record);

    case "digest":
      value = record.warcPayloadDigest;
      return value ? value.split(":", 2)[1] : null;
    }
  }
}


// ===========================================================================
export { Indexer, CDXIndexer };


