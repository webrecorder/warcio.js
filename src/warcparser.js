const StatusAndHeadersParser = require('./statusandheaders').StatusAndHeadersParser;
const WARCRecord = require('./warcrecord').WARCRecord;
const StreamReader = require('./readers').StreamReader;


// ===========================================================================
class WARCParser
{
  constructor({strictHeaders = false, parseHttp = true} = {}) {
    this._offset = 0;
    this._warcHeadersLength = 0;
    this._length = -1;

    this._headersClass = strictHeaders ? Headers : Map;
    this._parseHttp = parseHttp;

    this._atRecordBoundary = true;
    this._stream = null;
    this._record = null;

  }

  async readToNextRecord() {
    if (!this._atRecordBoundary && this._stream && this._record) {
      await this._record.skipFully();
      await this._stream.readSize(4, true);
      this._atRecordBoundary = true;
    }
  }

  parse(source) {
    return this._parse(StreamReader.toStreamReader(source));
  }

  async _parse(stream) {
    await this.readToNextRecord();

    this._offset = stream.getRawOffset();
    this._stream = stream;

    const headersParser = new StatusAndHeadersParser();

    const warcHeaders = await headersParser.parse(stream, {headersClass: Headers});

    if (!warcHeaders) {
      return null;
    }

    this._warcHeadersLength = stream.getReadOffset();

    const record = new WARCRecord({warcHeaders, stream});

    this._atRecordBoundary = false;
    this._record = record;

    if (!this._parseHttp) {
      return record;
    }

    switch (record.warcType) {
      case "response":
        await this.addHttpHeaders(record, headersParser, stream);
        break;

      case "request":
        await this.addHttpHeaders(record, headersParser, stream);
        break;

      case "revisit":
        if (record.warcContentLength > 0) {
          await this.addHttpHeaders(record, headersParser, stream);
        }
        break;
    }

    return record;
  }

  get offset() {
    return this._offset;
  }

  async recordLength() {
    await this._record.skipFully();
    return this._stream.getRawLength(this._offset);
  }

  async* iterRecords(source) {
    let record = null;

    this._stream = StreamReader.toStreamReader(source);

    while (record = await this._parse(this._stream)) {
      yield record;
    }

    this._record = null;
  }

  async addHttpHeaders(record, headersParser, stream) {
    const httpHeaders = await headersParser.parse(stream, {headersClass: this._headersClass});
    record.addHttpHeaders(httpHeaders, stream.getReadOffset() - this._warcHeadersLength);
  }
}


// ===========================================================================
exports.WARCParser = WARCParser;
