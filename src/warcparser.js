const StatusAndHeadersParser = require('./statusandheaders').StatusAndHeadersParser;
const WARCRecord = require('./warcrecord').WARCRecord;


// ===========================================================================
class WARCParser
{
  constructor(strictHeaders = false) {
    this._offset = 0;
    this._warcHeadersLength = 0;
    this._length = -1;

    this._headersClass = strictHeaders ? Headers : Map;
    this._atRecordBoundary = true;
    this._stream = null;
    this._record = null;
  }

  async readToNextRecord() {
    if (!this._atRecordBoundary && this._stream && this._record) {
      await this._record.readFully();
      await this._stream.readSize(4, false);
      this._atRecordBoundary = true;
    }
  }

  async parse(stream) {
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
    await this._record.readFully();
    return this._stream.getRawLength(this._offset);
  }

  async* iterRecords(stream) {
    let record = null;

    this._stream = stream;

    while (record = await this.parse(stream)) {
      this._record = record;
      yield record;
    }
  }

  async addHttpHeaders(record, headersParser, stream) {
    const httpHeaders = await headersParser.parse(stream, {headersClass: this._headersClass});
    record.addHttpHeaders(httpHeaders, stream.getReadOffset() - this._warcHeadersLength);
  }
}


// ===========================================================================
exports.WARCParser = WARCParser;
