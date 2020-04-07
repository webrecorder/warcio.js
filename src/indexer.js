const WARCParser = require('./warcparser').WARCParser;

const DEFAULT_FIELDS = 'offset,warc-type,warc-target-uri';


// ===========================================================================
class Indexer
{
  constructor(opts, out) {
    this.fields = opts.fields || DEFAULT_FIELDS;
    /* istanbul ignore next */
    this.out = out || process.stdout;

    this.parseHttp = true;
  }

  write(result) {
    this.out.write(JSON.stringify(result) + "\n");
  }

  async run(files) {
    const fields = this.fields.split(",");

    const params = {strictHeaders: true, parseHttp: this.parseHttp};

    for (const { filename, stream } of files) {
      const parser = new WARCParser(params);

      for await (const record of parser.iterRecords(stream)) {
        if (this.filterRecord && !this.filterRecord(record)) {
          continue;
        }

        const result = {};

        const offset = parser.offset;
        const length = await parser.recordLength();

        const special = {offset, length, filename};

        for (const field of fields) {
          if (special[field] != undefined) {
            result[field] = special[field];
          } else {
            this.setField(field, record, result);
          }
        }

        this.write(result);
      }
    }
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
        return record.httpHeaders.statusCode();
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
const DEFAULT_CDX_FIELDS = 'urlkey,timestamp,url,mime,status,digest,length,offset,filename';
const DEFAULT_LEGACY_CDX_FIELDS = 'urlkey,timestamp,url,mime,status,digest,redirect,meta,length,offset,filename'.split(',');


// ===========================================================================
class CDXIndexer extends Indexer
{
  constructor(opts, out) {
    super(opts, out);
    this.includeAll = opts.all;
    this.fields = DEFAULT_CDX_FIELDS;

    switch (opts.format) {
      case "cdxj":
        this.write = this.writeCDXJ;
        break;

      case "cdx":
        this.write = this.writeCDX11;
        break;

      case "json":
      default:
        // default write
        break;
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

  writeCDXJ(result) {
    const { urlkey, timestamp } = result;
    delete result.urlkey;
    delete result.timestamp;

    this.out.write(`${urlkey} ${timestamp} ${JSON.stringify(result)}\n`);
  }

  writeCDX11(result) {
    const value = [];

    for (const field of DEFAULT_LEGACY_CDX_FIELDS) {
      value.push(result[field] != undefined ? result[field] : "-");
    }

    this.out.write(value.join(" ") + "\n");
  }

  getField(field, record) {
    let value = null;

    switch (field) {
      case "urlkey":
        return this.getSurt(record.warcTargetURI);

      case "timestamp":
        value = record.warcDate;
        return value.replace(/[-:T]/g, '').slice(0, 14);

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

  getSurt(url) {
    try {
      const urlObj = new URL(url);

      const hostParts = urlObj.hostname.split(".").reverse();
      let surt = hostParts.join(",");
      if (urlObj.port) {
        surt += ":" + urlObj.port;
      }
      surt += ")";
      surt += urlObj.pathname;
      return surt.toLowerCase();
    } catch (e) {
      return url;
    }
  }
}


// ===========================================================================
exports.Indexer = Indexer;
exports.CDXIndexer = CDXIndexer;


