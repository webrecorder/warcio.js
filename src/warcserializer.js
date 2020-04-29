import base32 from 'hi-base32';

import { BaseAsyncIterReader } from './readers';
import { CRLF, CRLFCRLF } from './statusandheaders';


const encoder = new TextEncoder();


// ===========================================================================
class WARCSerializer extends BaseAsyncIterReader
{
  static async serialize(record) {
    let s = null;

    if ((record.warcType === "revisit") ||
        (record.warcPayloadDigest && record.warcBlockDigest)) {
      s = new WARCSerializer(record);
    } else {
      s = new WARCEnsureDigestSerializer(record);
    }

    return await s.readFully();
  }

  constructor(record) {
    super();
    this.record = record;
  }

  async* [Symbol.asyncIterator]() {
    const record = this.record;

    yield* record.warcHeaders.iterSerialize(encoder);
    yield CRLF;

    if (record.httpHeaders) {
      yield* record.httpHeaders.iterSerialize(encoder);
      yield CRLF;
    }
    yield* record.reader;
    yield CRLFCRLF;
  }
}


// ===========================================================================
class WARCEnsureDigestSerializer extends WARCSerializer
{
  async digestMessage(chunk) {
    const hashBuffer = await crypto.subtle.digest("sha-1", chunk);
    return "sha1:" + base32.encode(hashBuffer);
  }

  async* [Symbol.asyncIterator]() {
    const httpHeadersBuff = encoder.encode(this.record.httpHeaders.toString());

    const chunks = [];
    let payloadSize = 0;
    for await (const chunk of this.record) {
      chunks.push(chunk);
      payloadSize += chunk.length;
    }

    const payload = WARCSerializer.concatChunks(chunks, payloadSize);

    const size = httpHeadersBuff.length + CRLF.length + payload.length;
    const blockDigest = await this.digestMessage(WARCSerializer.concatChunks([httpHeadersBuff, CRLF, payload], size));
    const payloadDigest = await this.digestMessage(payload);

    this.record.warcHeaders.headers.set("WARC-Payload-Digest", payloadDigest);
    this.record.warcHeaders.headers.set("WARC-Block-Digest", blockDigest);
    this.record.warcHeaders.headers.set("Content-Length", size);

    const warcHeadersBuff = encoder.encode(this.record.warcHeaders.toString());

    yield warcHeadersBuff;
    yield CRLF;

    yield httpHeadersBuff;
    yield CRLF;

    yield payload;

    yield CRLFCRLF;
  }
}

export { WARCSerializer, WARCEnsureDigestSerializer };


