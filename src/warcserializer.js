import crypto from 'crypto';
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
  constructor(record, signingKey = null) {
    super(record);
    this.payloadDigester = new DigestComputer("sha1");
    this.blockDigester = new DigestComputer("sha1");

    if (record.warcPayloadDigest) {
      record.warcHeaders.headers.delete("WARC-Payload-Digest");
    }

    if (record.warcBlockDigest) {
      record.warcHeaders.headers.delete("WARC-Block-Digest");
    }

    this.signer = signingKey ? new Signer(signingKey, 'sha256') : null;
  }

  async* [Symbol.asyncIterator]() {
    const chunks = [];

    if (this.record.httpHeaders) {
      for await (const chunk of this.blockDigester.updateIter(this.record.httpHeaders.iterSerialize(encoder))) {
        chunks.push(chunk);
      }
      chunks.push(this.blockDigester.update(CRLF));
    }

    for await (const chunk of this.record.reader) {
      this.payloadDigester.update(chunk);
      this.blockDigester.update(chunk);
      chunks.push(chunk);
    }

    this.record.warcHeaders.headers.set("WARC-Payload-Digest", this.payloadDigester.toString());
    this.record.warcHeaders.headers.set("WARC-Block-Digest", this.blockDigester.toString());
    this.record.warcHeaders.headers.set("Content-Length", this.blockDigester.size);

    let warcHeadersIter = this.record.warcHeaders.iterSerialize(encoder);
    warcHeadersIter = this.signer ? this.signer.updateIter(warcHeadersIter) : warcHeadersIter;
    yield *warcHeadersIter;
    
    if (this.signer) {
      yield encoder.encode(`WARC-Signature: ${this.signer.toString()}\r\n`);
    }

    yield CRLF;

    for (const chunk of chunks) {
      yield chunk;
    }

    yield CRLFCRLF;
  }
}


// ===========================================================================
class DigestComputer
{
  constructor(hashType) {
    this.hashType = hashType;
    this.hash = crypto.createHash(hashType);
    this.size = 0;
  }

  update(chunk) {
    this.hash.update(chunk);
    this.size += chunk.length;
    return chunk;
  }

  async* updateIter(iter) {
    for await (const chunk of iter) {
      this.update(chunk);
      yield chunk;
    }
  }

  toString() {
    return this.hashType + ':' + base32.encode(this.hash.digest());
  }
}


// ===========================================================================
class Signer
{
  constructor(privateKey, hashType) {
    this.privateKey = privateKey;
    this.hashType = hashType;
    this.sign = crypto.createSign(hashType);
  }

  update(chunk) {
    this.sign.update(chunk);
    this.size += chunk.length;
    return chunk;
  }

  async* updateIter(iter) {
    for await (const chunk of iter) {
      this.update(chunk);
      yield chunk;
    }
  }

  toString() {
    return this.hashType + ':' + base32.encode(this.sign.sign(this.privateKey));
  }
}


export { WARCSerializer, WARCEnsureDigestSerializer, DigestComputer, Signer };


