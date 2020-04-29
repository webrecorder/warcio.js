import { StatusAndHeaders, StatusAndHeadersParser } from './statusandheaders';
import { WARCRecord } from './warcrecord';
import { AsyncIterReader, LimitReader } from './readers';


const defaultRecordCT = {
  'warcinfo': 'application/warc-fields',
  'response': 'application/http; msgtype=response',
  'revisit': 'application/http; msgtype=response',
  'request': 'application/http; msgtype=request',
  'metadata': 'application/warc-fields',
}


// ===========================================================================
class WARCParser
{
  static create({url, date, type, warcHeaders = {},
                headers = {}, status = '200', statusText = 'OK', httpVersion='HTTP/1.1',
                warcVersion = 'WARC/1.0'} = {}, reader) {

    warcHeaders = {...warcHeaders,
      'WARC-Target-URI': url,
      'WARC-Date': date,
      'WARC-Type': type
    }

    warcHeaders = new StatusAndHeaders({
      statusline: warcVersion,
      headers: new Headers(warcHeaders)
    });

    if (!warcHeaders.headers.get("content-type") && defaultRecordCT[type]) {
      warcHeaders.headers.set("content-type", defaultRecordCT[type]);
    }

    const record = new WARCRecord({warcHeaders, reader});

    switch (type) {
      case "response":
      case "request":
      case "revisit":
        record.httpHeaders = new StatusAndHeaders({
          statusline: httpVersion + " " + status + " " + statusText,
          headers: new Headers(headers)});
        break;
    }

    return record;
  }

 static parse(source, options) {
    return new WARCParser(source, options).parse();
  }

  static iterRecords(source, options) {
    return new WARCParser(source, options);
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
    if (!this._atRecordBoundary && this._reader && this._record) {
      await this._record.skipFully();
      await this._reader.readSize(4, true);
      this._atRecordBoundary = true;
    }
  }

  _initRecordReader(warcHeaders) {
    return new LimitReader(this._reader, warcHeaders.headers.get("Content-Length"));
  }

  async parse() {
    await this.readToNextRecord();

    this._offset = this._reader.getRawOffset();

    const headersParser = new StatusAndHeadersParser();

    const warcHeaders = await headersParser.parse(this._reader, {headersClass: this._headersClass});

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

    while (record = await this.parse(this._reader)) {
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

