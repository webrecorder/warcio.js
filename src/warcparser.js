import { StatusAndHeadersParser } from "./statusandheaders";
import { WARCRecord } from "./warcrecord";
import { AsyncIterReader, LimitReader } from "./readers";


const decoder = new TextDecoder();
const EMPTY = new Uint8Array([]);


// ===========================================================================
class WARCParser
{
  static parse(source, options) {
    return new WARCParser(source, options).parse();
  }

  static iterRecords(source, options) {
    return new WARCParser(source, options)[Symbol.asyncIterator]();
  }

  constructor(source, {keepHeadersCase = false, parseHttp = true} = {}) {
    this._offset = 0;
    this._warcHeadersLength = 0;

    this._headersClass = keepHeadersCase ? Map : Headers;
    this._parseHttp = parseHttp;

    this._atRecordBoundary = true;

    if (!(source instanceof AsyncIterReader)) {
      source = new AsyncIterReader(source);
    }

    this._reader = source;
    this._record = null;
  }

  async readToNextRecord() {
    let nextline;

    if (!this._atRecordBoundary && this._reader && this._record) {
      await this._record.skipFully();

      let lineLen = 0;

      nextline = await this._reader.readlineRaw();
      if (!nextline) {
        nextline = EMPTY;
      } else {
        lineLen = nextline.byteLength - 1;

        while (lineLen >= 0) {
          const value = nextline[lineLen - 1];
          if (value !== 10 && value !== 13) {
            break;
          }
          lineLen--;
        }
      }

      if (lineLen) {
        console.warn(`Content-Length Too Small: Record not followed by newline, \
Remainder Length: ${lineLen}, \
Offset: ${this._reader.getRawOffset() - nextline.byteLength}`);
      }

      if (this._reader.compressed) {
        await this._reader.readSize(2, true);
        nextline = EMPTY;
      } else {
        nextline = await this._reader.readlineRaw();

        // consume remaining new lines
        while (nextline && nextline.byteLength === 2) {
          nextline = await this._reader.readlineRaw();
        }
      }
    }

    this._atRecordBoundary = true;
    return nextline ? decoder.decode(nextline) : "";
  }

  _initRecordReader(warcHeaders) {
    return new LimitReader(this._reader, Number(warcHeaders.headers.get("Content-Length") || 0));
  }

  async parse() {
    const firstLine = await this.readToNextRecord();

    this._offset = this._reader.getRawOffset() - firstLine.length;

    const headersParser = new StatusAndHeadersParser();

    const warcHeaders = await headersParser.parse(this._reader, {firstLine, headersClass: this._headersClass});

    if (!warcHeaders) {
      return null;
    }

    this._warcHeadersLength = this._reader.getReadOffset();

    const record = new WARCRecord({warcHeaders, reader: this._initRecordReader(warcHeaders)});

    this._atRecordBoundary = false;
    this._record = record;

    if (this._parseHttp) {
      switch (record.warcType) {
      case "response":
      case "request":
        await this._addHttpHeaders(record, headersParser, this._reader);
        break;

      case "revisit":
        if (record.warcContentLength > 0) {
          await this._addHttpHeaders(record, headersParser, this._reader);
        }
        break;
      }
    }

    return record;
  }

  get offset() {
    return this._offset;
  }

  get recordLength() {
    return this._reader.getRawLength(this._offset);
  }

  async* [Symbol.asyncIterator]() {
    let record = null;

    while ((record = await this.parse()) !== null) {
      yield record;
    }

    this._record = null;
  }

  async _addHttpHeaders(record, headersParser) {
    const httpHeaders = await headersParser.parse(this._reader, {headersClass: this._headersClass});
    record.httpHeaders = httpHeaders;

    const headersLen = this._reader.getReadOffset() - this._warcHeadersLength;
    if (record.reader.setLimitSkip) {
      record.reader.setLimitSkip(record.warcContentLength - headersLen);
    }
  }
}


// ===========================================================================
export { WARCParser };

