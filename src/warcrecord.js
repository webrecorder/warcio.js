const LimitReader = require('./readers').LimitReader;


// ===========================================================================
class WARCRecord
{
  constructor({warcHeaders, stream}) {
    this.warcHeaders = warcHeaders;
    this.headersLen = 0;

    this.stream = new LimitReader(stream, this.warcContentLength);

    this.payload = null;
    this.httpHeaders = null;
    this.httpInfo = null;

    this.fixUp();
  }

  addHttpHeaders(httpHeaders, headersLen) {
    this.httpHeaders = httpHeaders;
    this.headersLen = headersLen;

    this.stream.setLimitSkip(this.warcContentLength - this.headersLen);

    this.httpInfo = {headers: httpHeaders.headers,
                     statusCode: httpHeaders.statusCode(),
                     statusReason: httpHeaders.statusText};
  }

  fixUp() {
    // Fix wget-style error where WARC-Target-URI is wrapped in <>
    const uri = this.warcHeaders.headers.get("WARC-Target-URI");
    if (uri && uri.startsWith("<") && uri.endsWith(">")) {
      this.warcHeaders.headers.set("WARC-Target-URI", uri.slice(1, -1));
    }
  }

  async readFully() {
    if (this.payload) {
      return this.payload;
    }

    this.payload = await this.stream.readFully();
    return this.payload;
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

  get warcContentType() {
    return this.warcHeaders.headers.get("Content-Type");
  }

  get warcContentLength() {
    return Number(this.warcHeaders.headers.get("Content-Length"));
  }
}


// ===========================================================================
exports.WARCRecord = WARCRecord;

