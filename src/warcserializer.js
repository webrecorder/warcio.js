import base32 from 'hi-base32';
import { Deflate } from 'pako/lib/deflate';

import { BaseAsyncIterReader } from './readers';
import { CRLF, CRLFCRLF } from './statusandheaders';


const encoder = new TextEncoder();


// ===========================================================================
class WARCSerializer extends BaseAsyncIterReader
{
  static async serialize(record, opts) {
    const s = new WARCSerializer(record, opts);
    return await s.readFully();
  }

  static base16(hashBuffer) {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  constructor(record, opts = {}) {
    super();
    this.record = record;
    this.gzip = opts.gzip;

    const digestOpts = opts && opts.digest || {};

    if (record.warcType !== "revisit" && record.warcType !== "warcinfo" &&
       (!record.warcPayloadDigest || !record.warcBlockDigest)) {
      this.digestAlgo = digestOpts.algo || "sha-256";
      this.digestAlgoPrefix = digestOpts.prefix || "sha-256:";
      this.digestBase32 = digestOpts.base32 || false;
    } else {
      this.digestAlgo = null;
    }
  }

  async* [Symbol.asyncIterator]() {
    if (!this.gzip) {
      yield* this.generateRecord();
      return;
    }

    const deflater = new Deflate({gzip: true});

    let lastChunk = null;

    for await (const chunk of this.generateRecord()) {
      if (lastChunk && lastChunk.length > 0) {
        deflater.push(lastChunk);
      }
      lastChunk = chunk;

      while (deflater.chunks.length) {
        yield deflater.chunks.shift();
      }
    }

    deflater.push(lastChunk, true);
    yield deflater.result;
  }

  async digestMessage(chunk) {
    const hashBuffer = await crypto.subtle.digest(this.digestAlgo, chunk);
    return this.digestAlgoPrefix + (this.digestBase32 ? base32.encode(hashBuffer) : WARCSerializer.base16(hashBuffer));
  }

  async* generateRecord() {
    let size = 0;

    let httpHeadersBuff = null;

    if (this.record.httpHeaders) {
      httpHeadersBuff = encoder.encode(this.record.httpHeaders.toString() + "\r\n");
      size += httpHeadersBuff.length;
    }

    const payload = await this.record.readFully();
    size += payload.length;

    // if digestAlgo is set, compute digests, otherwise only content-length
    if (this.digestAlgo) {
      const payloadDigest = await this.digestMessage(payload);
      const blockDigest = httpHeadersBuff ? await this.digestMessage(WARCSerializer.concatChunks([httpHeadersBuff, payload], size)) : payloadDigest;

      this.record.warcHeaders.headers.set("WARC-Payload-Digest", payloadDigest);
      this.record.warcHeaders.headers.set("WARC-Block-Digest", blockDigest);
    }

    this.record.warcHeaders.headers.set("Content-Length", size);

    const warcHeadersBuff = encoder.encode(this.record.warcHeaders.toString());

    yield warcHeadersBuff;
    yield CRLF;

    if (httpHeadersBuff) {
      yield httpHeadersBuff;
    }

    yield payload;

    yield CRLFCRLF;
  }
}

export { WARCSerializer };


