import uuid from "uuid-random";
import { BaseAsyncIterReader, AsyncIterReader, LimitReader } from "./readers";
import { StatusAndHeaders } from "./statusandheaders";
import { Source } from "./types";

const decoder = new TextDecoder("utf-8");
const encoder = new TextEncoder();

export const WARC_1_1 = "WARC/1.1";
export const WARC_1_0 = "WARC/1.0";

const REVISIT_PROFILE_1_0 =
  "http://netpreserve.org/warc/1.0/revisit/identical-payload-digest";
const REVISIT_PROFILE_1_1 =
  "http://netpreserve.org/warc/1.1/revisit/identical-payload-digest";

export type WARCType =
  | "warcinfo"
  | "response"
  | "resource"
  | "request"
  | "metadata"
  | "revisit"
  | "conversion"
  | "continuation";

const defaultRecordCT: Partial<Record<WARCType, string>> = {
  warcinfo: "application/warc-fields",
  response: "application/http; msgtype=response",
  revisit: "application/http; msgtype=response",
  request: "application/http; msgtype=request",
  metadata: "application/warc-fields",
};

// ===========================================================================
export type WARCRecordOpts = {
  url?: string;
  date?: string;
  type?: WARCType;
  warcHeaders?: Record<string, string>;
  filename?: string;
  httpHeaders?: HeadersInit;
  statusline?: string;
  warcVersion?: typeof WARC_1_0 | typeof WARC_1_1;
  keepHeadersCase?: boolean;
  refersToUrl?: string;
  refersToDate?: string;
};

// ===========================================================================
export class WARCRecord extends BaseAsyncIterReader {
  static create(
    {
      url,
      date,
      type,
      warcHeaders = {},
      filename = "",
      httpHeaders = {},
      statusline = "HTTP/1.1 200 OK",
      warcVersion = WARC_1_0,
      keepHeadersCase = true,
      refersToUrl = undefined,
      refersToDate = undefined,
    }: WARCRecordOpts = {},
    reader?: AsyncIterable<Uint8Array>
  ) {
    function checkDate(d: string) {
      const date = d;
      if (warcVersion === WARC_1_0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constant
        d = d.split(".")[0]!;
        if (d.charAt(date.length - 1) != "Z") {
          d += "Z";
        }
      }
      return d;
    }

    date = checkDate(date || new Date().toISOString());

    warcHeaders = { ...warcHeaders };
    if (type === "warcinfo") {
      if (filename) {
        warcHeaders["WARC-Filename"] = filename;
      }
    } else if (url) {
      warcHeaders["WARC-Target-URI"] = url;
    }

    warcHeaders["WARC-Date"] = date;

    if (type) {
      warcHeaders["WARC-Type"] = type;
    }

    if (type === "revisit") {
      warcHeaders["WARC-Profile"] =
        warcVersion === WARC_1_1 ? REVISIT_PROFILE_1_1 : REVISIT_PROFILE_1_0;
      if (refersToUrl) {
        warcHeaders["WARC-Refers-To-Target-URI"] = refersToUrl;
        warcHeaders["WARC-Refers-To-Date"] = checkDate(
          refersToDate || new Date().toISOString()
        );
      }
    }

    const warcHeadersObj = new StatusAndHeaders({
      statusline: warcVersion,
      headers: new Map(Object.entries(warcHeaders))
    });

    if (!warcHeadersObj.headers.get("WARC-Record-ID")) {
      warcHeadersObj.headers.set("WARC-Record-ID", `<urn:uuid:${uuid()}>`);
    }

    if (!warcHeadersObj.headers.get("Content-Type")) {
      warcHeadersObj.headers.set(
        "Content-Type",
        (type && defaultRecordCT[type]) || "application/octet-stream"
      );
    }

    if (!reader) {
      reader = emptyReader();
    }

    const record = new WARCRecord({ warcHeaders: warcHeadersObj, reader });
    let headers: Map<string, string> | Headers | null = null;
    let entries: [string, string][] = [];

    switch (type) {
      case "response":
      case "request":
      case "revisit":
        entries = Object.entries(httpHeaders);
        headers = keepHeadersCase ? new Map(entries) : new Headers(httpHeaders);

        // for revisit records, if there are no http headers, don't add statusline
        // for other request/response, add an empty statusline-only block
        if (entries.length > 0 || type !== "revisit") {
          record.httpHeaders = new StatusAndHeaders({ statusline, headers });
        }
        break;
    }

    return record;
  }

  static createWARCInfo(
    opts: WARCRecordOpts = {},
    info: Record<string, string>
  ) {
    async function* genInfo() {
      for (const [name, value] of Object.entries(info)) {
        yield encoder.encode(`${name}: ${value}\r\n`);
      }
    }

    opts.type = "warcinfo";

    return WARCRecord.create(opts, genInfo());
  }

  warcHeaders: StatusAndHeaders;
  _reader: AsyncIterable<Uint8Array>;
  _contentReader: BaseAsyncIterReader | null;
  payload: Uint8Array | null;
  httpHeaders: StatusAndHeaders | null;
  consumed: "content" | "raw" | "skipped" | "";

  _offset = 0;
  _length = 0;

  method = "";
  requestBody = "";
  _urlkey = "";

  constructor({
    warcHeaders,
    reader,
  }: {
    warcHeaders: StatusAndHeaders;
    reader: AsyncIterable<Uint8Array>;
  }) {
    super();

    this.warcHeaders = warcHeaders;

    this._reader = reader;
    this._contentReader = null;

    this.payload = null;
    this.httpHeaders = null;

    this.consumed = "";

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
      statusText: httpHeaders.statusText,
    };
  }

  fixUp() {
    // Fix wget-style error where WARC-Target-URI is wrapped in <>
    const uri = this.warcHeaders.headers.get("WARC-Target-URI");
    if (uri && uri.startsWith("<") && uri.endsWith(">")) {
      this.warcHeaders.headers.set("WARC-Target-URI", uri.slice(1, -1));
    }
  }

  override async readFully(isContent = false) {
    // if have httpHeaders, need to consider transfer and content decoding is decoding content vs raw data
    if (this.httpHeaders) {
      // if payload is empty, just return
      if (this.payload && !this.payload.length) {
        return this.payload;
      }

      // otherwise, can't serialize payload as raw if already started reading
      if (this._contentReader && !isContent) {
        throw new TypeError(
          "WARC Record decoding already started, but requesting raw payload"
        );
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
    // already consumed payload, and know its empty, just return empty reader
    if (this.payload && !this.payload.length) {
      return emptyReader();
    }

    if (this._contentReader) {
      throw new TypeError(
        "WARC Record decoding already started, but requesting raw payload"
      );
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

  _createDecodingReader(source: Source) {
    // only called if this.httpHeaders !== null
    if (!this.httpHeaders) {
      throw new Error(
        "WARCRecord cannot call _createDecodingReader when this.httpHeaders === null"
      );
    }

    let contentEnc = this.httpHeaders.headers.get("Content-Encoding") as string;
    const transferEnc = this.httpHeaders.headers.get(
      "Transfer-Encoding"
    ) as string;

    const chunked = transferEnc === "chunked";

    // Transfer-Encoding is not chunked and no Content-Encoding
    // try Transfer-Encoding as Content-Encoding
    if (!contentEnc && !chunked) {
      contentEnc = transferEnc;
    }

    return new AsyncIterReader(source, contentEnc, chunked);
  }

  async readlineRaw(maxLength?: number) {
    if (this.consumed) {
      throw new Error(
        "Record already consumed.. Perhaps a promise was not awaited?"
      );
    }
    if (this.contentReader instanceof BaseAsyncIterReader) {
      return this.contentReader.readlineRaw(maxLength);
    }
    throw new Error(
      "WARCRecord cannot call readlineRaw on this.contentReader if it does not extend BaseAsyncIterReader"
    );
  }

  async contentText() {
    const payload = await this.readFully(true);
    return decoder.decode(payload);
  }

  async *[Symbol.asyncIterator]() {
    for await (const chunk of this.contentReader) {
      yield chunk;
      if (this.consumed) {
        throw new Error(
          "Record already consumed.. Perhaps a promise was not awaited?"
        );
      }
    }

    this.consumed = "content";
  }

  async skipFully() {
    if (this.consumed) {
      return;
    }
    if (this._reader instanceof LimitReader) {
      const res = await this._reader.skipFully();
      this.consumed = "skipped";
      return res;
    }
    throw new Error(
      "WARCRecord cannot call skipFully on this._reader if it is not a LimitReader"
    );
  }

  warcHeader(name: string) {
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
// eslint-disable-next-line @typescript-eslint/no-empty-function
async function* emptyReader() : AsyncGenerator<never, void, unknown> { }
