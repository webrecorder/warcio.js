import { StatusAndHeadersParser } from './statusandheaders';
import { WARCRecord } from './warcrecord';
import { AsyncIterReader } from './readers';


// ===========================================================================
class WARCParser
{
  constructor(source, {strictHeaders = false, parseHttp = true} = {}) {
    this._offset = 0;
    this._warcHeadersLength = 0;

    this._headersClass = strictHeaders ? Headers : Map;
    this._parseHttp = parseHttp;

    this._atRecordBoundary = true;

    if (!(source instanceof AsyncIterReader)) {
      source = new AsyncIterReader(source);
    }

    this._reader = source;
    this._record = null;

  }

  async readToNextRecord() {
    if (!this._atRecordBoundary && this._reader && this._record) {
      await this._record.skipFully();
      await this._reader.readSize(4, true);
      this._atRecordBoundary = true;
    }
  }

  async parse() {
    await this.readToNextRecord();

    this._offset = this._reader.getRawOffset();

    const headersParser = new StatusAndHeadersParser();

    const warcHeaders = await headersParser.parse(this._reader, {headersClass: Headers});

    if (!warcHeaders) {
      return null;
    }

    this._warcHeadersLength = this._reader.getReadOffset();

    const record = new WARCRecord({warcHeaders, reader: this._reader});

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

  async recordLength() {
    const res = await this._record.skipFully();
    return this._reader.getRawLength(this._offset);
  }

  async* [Symbol.asyncIterator]() {
    let record = null;

    while (record = await this.parse(this._reader)) {
      yield record;
    }

    this._record = null;
  }

  async _addHttpHeaders(record, headersParser, reader) {
    const httpHeaders = await headersParser.parse(reader, {headersClass: this._headersClass});
    record._addHttpHeaders(httpHeaders, reader.getReadOffset() - this._warcHeadersLength);
  }
}


// ===========================================================================
export { WARCParser };

