import {
  StatusAndHeadersParser,
  type StatusAndHeaders,
} from "./statusandheaders";
import { WARCRecord } from "./warcrecord";
import { AsyncIterReader, LimitReader } from "./readers";
import { type Source, type IndexerOffsetLength } from "./types";

const decoder = new TextDecoder();
const EMPTY = new Uint8Array([]);

export type WARCParserOpts = {
  keepHeadersCase?: boolean;
  parseHttp?: boolean;
};

// ===========================================================================
export class WARCParser implements IndexerOffsetLength {
  static async parse(source: Source, options?: WARCParserOpts) {
    return new WARCParser(source, options).parse();
  }

  static iterRecords(source: Source, options?: WARCParserOpts) {
    return new WARCParser(source, options)[Symbol.asyncIterator]();
  }

  _offset: number;
  _warcHeadersLength: number;

  _headersClass: typeof Map | typeof Headers;
  _parseHttp: boolean;

  _reader: AsyncIterReader;

  _record: WARCRecord | null;

  constructor(
    source: Source,
    { keepHeadersCase = false, parseHttp = true }: WARCParserOpts = {}
  ) {
    this._offset = 0;
    this._warcHeadersLength = 0;

    this._headersClass = keepHeadersCase ? Map : Headers;
    this._parseHttp = parseHttp;

    if (!(source instanceof AsyncIterReader)) {
      this._reader = new AsyncIterReader(source);
    } else {
      this._reader = source;
    }

    this._record = null;
  }

  async readToNextRecord() {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!this._reader || !this._record) {
      return EMPTY;
    }

    await this._record.skipFully();

    if (this._reader.compressed) {
      this._offset = this._reader.getRawOffset();
    }

    let nextline = await this._reader.readlineRaw();

    let lineLen = 0;

    if (!nextline) {
      nextline = EMPTY;
    } else {
      lineLen = nextline.byteLength - 1;

      // if line starts with WARC/, we're actually in a new record, return immediately
      if (lineLen === 9 && decoder.decode(nextline).startsWith("WARC/")) {
        return nextline;
      }

      // otherwise, detect leftover data
      while (lineLen > 0) {
        const value = nextline[lineLen - 1];
        if (value !== 10 && value !== 13) {
          break;
        }
        lineLen--;
      }

      if (lineLen) {
        console.warn(`Content-Length Too Small: Record not followed by newline, \
Remainder Length: ${lineLen}, \
Offset: ${this._reader.getRawOffset() - nextline.byteLength}`);
      }
    }

    if (this._reader.compressed) {
      await this._reader.skipSize(2);
      nextline = EMPTY;
    } else {
      nextline = await this._reader.readlineRaw();

      // consume remaining new lines
      while (nextline && nextline.byteLength === 2) {
        nextline = await this._reader.readlineRaw();
      }

      this._offset = this._reader.getRawOffset();
      if (nextline) {
        this._offset -= nextline.length;
      }
    }

    return nextline;
  }

  _initRecordReader(warcHeaders: StatusAndHeaders) {
    return new LimitReader(
      this._reader,
      Number(warcHeaders.headers.get("Content-Length") || 0)
    );
  }

  async parse() {
    const firstLineBuff = await this.readToNextRecord();
    const firstLine = firstLineBuff ? decoder.decode(firstLineBuff) : "";

    const headersParser = new StatusAndHeadersParser();
    const warcHeaders = await headersParser.parse(this._reader, {
      firstLine,
      headersClass: this._headersClass,
    });

    if (!warcHeaders) {
      return null;
    }

    this._warcHeadersLength = this._reader.getReadOffset();

    const record = new WARCRecord({
      warcHeaders,
      reader: this._initRecordReader(warcHeaders),
    });

    this._record = record;

    if (this._parseHttp) {
      switch (record.warcType) {
        case "response":
        case "request":
          await this._addHttpHeaders(record, headersParser);
          break;

        case "revisit":
          if (record.warcContentLength > 0) {
            await this._addHttpHeaders(record, headersParser);
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

  async *[Symbol.asyncIterator]() {
    let record = null;

    while ((record = await this.parse()) !== null) {
      yield record;
    }

    this._record = null;
  }

  async _addHttpHeaders(
    record: WARCRecord,
    headersParser: StatusAndHeadersParser
  ) {
    const httpHeaders = await headersParser.parse(this._reader, {
      headersClass: this._headersClass,
    });
    record.httpHeaders = httpHeaders;

    const headersLen = this._reader.getReadOffset() - this._warcHeadersLength;
    if (record.reader instanceof LimitReader) {
      record.reader.setLimitSkip(record.warcContentLength - headersLen);
    }
  }
}

// ===========================================================================
