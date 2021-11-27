import { BaseAsyncIterReader, AsyncIterReader } from "./readers";
import { StatusAndHeaders } from "./statusandheaders";
import uuid from "uuid-random";

const decoder = new TextDecoder("utf-8");
const encoder = new TextEncoder("utf-8");

const WARC_1_1 = "WARC/1.1";
const WARC_1_0 = "WARC/1.0";

const REVISIT_PROFILE_1_0 = "http://netpreserve.org/warc/1.0/revisit/identical-payload-digest";
const REVISIT_PROFILE_1_1 = "http://netpreserve.org/warc/1.1/revisit/identical-payload-digest";

const defaultRecordCT = {
  "warcinfo": "application/warc-fields",
  "response": "application/http; msgtype=response",
  "revisit": "application/http; msgtype=response",
  "request": "application/http; msgtype=request",
  "metadata": "application/warc-fields",
};


// ===========================================================================
class WARCRecord extends BaseAsyncIterReader
{
  static create({url, date, type, warcHeaders = {}, filename = "",
    httpHeaders = {}, statusline = "HTTP/1.1 200 OK",
    warcVersion = WARC_1_0, keepHeadersCase = true, refersToUrl = undefined, refersToDate = undefined} = {}, reader) {

    function checkDate(d) {
      if (warcVersion === WARC_1_0) {
        d = d.split(".")[0];
        if (d.charAt(date.length - 1) != "Z") {
          d += "Z";
        }
      }
      return d;
    }

    if (!date) {
      date = new Date().toISOString();
    }

    date = checkDate(date);

    warcHeaders = {...warcHeaders};
    if (type === "warcinfo") {
      if (filename) {
        warcHeaders["WARC-Filename"] = filename;
      }

    } else {
      warcHeaders["WARC-Target-URI"] = url;
    }

    warcHeaders["WARC-Date"] = date;
    warcHeaders["WARC-Type"] = type;

    if (type === "revisit") {
      warcHeaders["WARC-Profile"] = warcVersion === WARC_1_1 ? REVISIT_PROFILE_1_1 : REVISIT_PROFILE_1_0;
      warcHeaders["WARC-Refers-To-Target-URI"] = refersToUrl;
      warcHeaders["WARC-Refers-To-Date"] = checkDate(refersToDate);
    }

    warcHeaders = new StatusAndHeaders({
      statusline: warcVersion,
      headers: keepHeadersCase ? new Map(Object.entries(warcHeaders)) : new Headers(warcHeaders)
    });

    if (!warcHeaders.headers.get("WARC-Record-ID")) {
      warcHeaders.headers.set("WARC-Record-ID", `<urn:uuid:${uuid()}>`);
    }

    if (!warcHeaders.headers.get("Content-Type")) {
      warcHeaders.headers.set("Content-Type", defaultRecordCT[type] || "application/octet-stream");
    }

    if (!reader) {
      const emptyReader = async function* () {};
      reader = emptyReader();
    }

    const record = new WARCRecord({warcHeaders, reader});
    let headers = null;
    let entries = null;

    switch (type) {
    case "response":
    case "request":
    case "revisit":
      entries = Object.entries(httpHeaders);
      headers = keepHeadersCase ? new Map(entries) : new Headers(httpHeaders);

      // for revisit records, if there are no http headers, don't add statusline
      // for other request/response, add an empty statusline-only block
      if (entries.length > 0 || type !== "revisit") {
        record.httpHeaders = new StatusAndHeaders({statusline, headers});
      }
      break;
    }

    return record;
  }

  static createWARCInfo(opts = {}, info) {
    async function* genInfo() {
      for (const [name, value] of Object.entries(info)) {
        yield encoder.encode(`${name}: ${value}\r\n`);
      }
    }

    opts.type = "warcinfo";

    return WARCRecord.create(opts, genInfo());
  }

  constructor({warcHeaders, reader}) {
    super();

    this.warcHeaders = warcHeaders;

    this._reader = reader;
    this._contentReader = null;

    this.payload = null;
    this.httpHeaders = null;

    this.consumed = false;

    this.fixUp();
  }

  getResponseInfo() {
    const httpHeaders = this.httpHeaders;

    if (!httpHeaders) {
      return null;
    }

    // match parameters for Response(..., initOpts);
    return {
      headers: httpHeaders.headers,
      status: httpHeaders.statusCode,
      statusText: httpHeaders.statusText
    };
  }

  fixUp() {
    // Fix wget-style error where WARC-Target-URI is wrapped in <>
    const uri = this.warcHeaders.headers.get("WARC-Target-URI");
    if (uri && uri.startsWith("<") && uri.endsWith(">")) {
      this.warcHeaders.headers.set("WARC-Target-URI", uri.slice(1, -1));
    }
  }

  async readFully(isContent = false) {

    // if have httpHeaders, need to consider transfer and content decoding is decoding content vs raw data
    if (this.httpHeaders) {
      // if payload is empty, just return
      if (this.payload && !this.payload.length) {
        return this.payload;
      }

      // otherwise, can't serialize payload as raw if already started reading
      if (this._contentReader && !isContent) {
        throw new TypeError("WARC Record decoding already started, but requesting raw payload");
      }

      // reading content, but already consumed raw data, convert
      if (isContent && this.consumed === "raw" && this.payload) {
        return await this._createDecodingReader([this.payload]).readFully();
      }
    }

    if (this.payload) {
      return this.payload;
    }

    if (isContent) {
      this.payload = await super.readFully();
      this.consumed = "content";
    } else {
      this.payload = await WARCRecord.readFully(this._reader);
      this.consumed = "raw";
    }

    return this.payload;
  }

  get reader() {
    if (this._contentReader) {
      throw new TypeError("WARC Record decoding already started, but requesting raw payload");
    }

    return this._reader;
  }

  get contentReader() {
    if (!this.httpHeaders) {
      return this._reader;
    }

    if (!this._contentReader) {
      this._contentReader = this._createDecodingReader(this._reader);
    }

    return this._contentReader;
  }

  _createDecodingReader(source) {
    let contentEnc = this.httpHeaders.headers.get("Content-Encoding");
    let transferEnc = this.httpHeaders.headers.get("Transfer-Encoding");

    const chunked = (transferEnc === "chunked");

    // Transfer-Encoding is not chunked and no Content-Encoding
    // try Transfer-Encoding as Content-Encoding
    if (!contentEnc && !chunked) {
      contentEnc = transferEnc;
    }

    return new AsyncIterReader(source, contentEnc, chunked);
  }

  async readlineRaw(maxLength) {
    if (this.consumed) {
      throw new Error("Record already consumed.. Perhaps a promise was not awaited?");
    }
    return this.contentReader.readlineRaw(maxLength);
  }

  async contentText() {
    const payload = await this.readFully(true);
    return decoder.decode(payload);
  }

  async* [Symbol.asyncIterator]() {
    for await (const chunk of this.contentReader) {
      yield chunk;
      if (this.consumed) {
        throw new Error("Record already consumed.. Perhaps a promise was not awaited?");
      }
    }

    this.consumed = "content";
  }

  async skipFully() {
    if (this.consumed) {
      return;
    }

    const res = await this._reader.skipFully();
    this.consumed = "skipped";
    return res;
  }

  warcHeader(name) {
    return this.warcHeaders.headers.get(name);
  }

  get warcType() {
    return this.warcHeaders.headers.get("WARC-Type");
  }

  get warcTargetURI() {
    return this.warcHeaders.headers.get("WARC-Target-URI");
  }

  get warcDate() {
    return this.warcHeaders.headers.get("WARC-Date");
  }

  get warcRefersToTargetURI() {
    return this.warcHeaders.headers.get("WARC-Refers-To-Target-URI");
  }

  get warcRefersToDate() {
    return this.warcHeaders.headers.get("WARC-Refers-To-Date");
  }

  get warcPayloadDigest() {
    return this.warcHeaders.headers.get("WARC-Payload-Digest");
  }

  get warcBlockDigest() {
    return this.warcHeaders.headers.get("WARC-Block-Digest");
  }

  get warcContentType() {
    return this.warcHeaders.headers.get("Content-Type");
  }

  get warcContentLength() {
    return Number(this.warcHeaders.headers.get("Content-Length"));
  }
}


// ===========================================================================
export { WARCRecord };

