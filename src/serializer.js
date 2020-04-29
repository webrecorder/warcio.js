import crypto from 'crypto';

import { BaseAsyncIterReader, AsyncIterReader, LimitReader } from './readers';
import { StatusAndHeadersParser, CRLF, CRLFCRLF } from './statusandheaders';
import { WARCParser } from './warcparser';

import base32 from 'hi-base32';


const key = `\
-----BEGIN EC PRIVATE KEY-----
MHQCAQEEIGBrv16tAxgnDENbNSWH5Z3/oL+z9ZlwMsZB4t09ay4CoAcGBSuBBAAK
oUQDQgAEGkTqpR+xaWr+0REMiqBUlknYGhhIUzAqzLMItu0VyupywAe5Y0Lb4kpO
iHx4/r2NoWpwAJ5HtdaZIuRGNEI4+A==
-----END EC PRIVATE KEY-----
`;


// ===========================================================================
class WARCRecordStreamer extends BaseAsyncIterReader
{
  constructor(record) {
    super();
    this.record = record;
  }

  async* [Symbol.asyncIterator](encoder) {
    if (!encoder) {
      encoder = new TextEncoder();
    }

    //const signer = new Signer('sha256');

    const blockDigest = new DigestComputer("sha1");
    const payloadDigest = new DigestComputer("sha1");

    yield encoder.encode('S');
    yield* this.record.warcHeaders.iterSerialize(encoder);
    //yield encoder.encode("WARC-Trailer: WARC-Payload-Digest,WARC-Block-Digest\r\n");
    yield CRLF;

    if (this.record.httpHeaders) {
      yield* blockDigest.updateIter(this.record.httpHeaders.iterSerialize(encoder));
      yield blockDigest.update(CRLF);
    }
    for await (const chunk of this.record.reader) {
      yield encoder.encode(chunk.length + "\r\n");
      payloadDigest.update(blockDigest.update(chunk));
      yield chunk;
      yield encoder.encode("\r\n");
    }

    yield encoder.encode("0\r\n\r\n");
    //yield* payloadDigest.updateIter(blockDigest.updateIter(this.record.reader));

    //const signature = signer.toString();

    yield encoder.encode(`\
TWARC/1.0\r\n\
WARC-Payload-Digest: ${payloadDigest.toString()}\r\n\
WARC-Block-Digest: ${blockDigest.toString()}\r\n\
Content-Length: ${blockDigest.size}\r\n\
\r\n\r\n`);
  }
}


// ===========================================================================
class SWARCParser extends WARCParser
{
  _initRecordReader(warcHeaders) {
    return new SWARCReader(this._reader, this);
  }
}


// ===========================================================================
class SWARCReader extends BaseAsyncIterReader
{
  constructor(reader, parser) {
    super();
    this._origReader = reader;
    this._parser = parser;
    this._dechunkingReader = new AsyncIterReader(reader, null, true);
  }

  async* [Symbol.asyncIterator]() {
    yield* this._dechunkingReader;

    const trailersParser = new StatusAndHeadersParser();
    const trailers = await trailersParser.parse(this._origReader);

    if (this._parser._record) {
      const warcHeaders = this._parser._record.warcHeaders;
      for (const [name, value] of trailers.headers) {
        warcHeaders.headers.append(name, value);
      }
      warcHeaders.statusline = warcHeaders.statusline.slice(1);
    }
  }

  async* buffered() {
    let lastChunk = null;

    for await (const chunk of this._reader) {
      if (chunk.length < 4) {
        yield chunk;
        continue;
      }

      // ends in \r\n\r\n, see if this is the end
      if (new Uint32Array(chunk.slice(-4).buffer)[0] !== 0x0A0D0A0D) {
        yield chunk;
      }

      lastChunk = chunk;
    }

    if (lastChunk) {

    }
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
  constructor(hashType) {
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
    return this.hashType + ':' + base32.encode(this.sign.sign(key));
    //return this.hashType + ':' + this.sign.sign(key, 'hex');
  }

}


export { WARCRecordStreamer, SWARCParser };


