import { BaseAsyncIterReader, AsyncIterReader } from './readers';
import { StatusAndHeadersParser, CRLF, CRLFCRLF } from './statusandheaders';
import { WARCParser } from './warcparser';
import { WARCEnsureDigestSerializer } from './warcserializer';


// ===========================================================================
class SWARCSerializer extends WARCEnsureDigestSerializer
{
  async* [Symbol.asyncIterator](encoder) {
    if (!encoder) {
      encoder = new TextEncoder();
    }

    yield encoder.encode('S');

    let warcHeadersIter = this.record.warcHeaders.iterSerialize(encoder);
    warcHeadersIter = this.signer ? this.signer.updateIter(warcHeadersIter) : warcHeadersIter;
    yield *warcHeadersIter;
    
    yield CRLF;

    if (this.record.httpHeaders) {
      yield* this.blockDigester.updateIter(this.record.httpHeaders.iterSerialize(encoder));
      yield this.blockDigester.update(CRLF);
    }

    for await (const chunk of this.record.reader) {
      yield encoder.encode(chunk.length + "");
      yield CRLF;
      this.payloadDigester.update(chunk);
      this.blockDigester.update(chunk);
      yield chunk;
      yield CRLF;
    }

    yield encoder.encode("0");
    yield CRLFCRLF;

    //const signature = signer.toString();

    yield encoder.encode(`TWARC/1.0\r\n`);

    const trailer = encoder.encode(`\
WARC-Payload-Digest: ${this.payloadDigester.toString()}\r\n\
WARC-Block-Digest: ${this.blockDigester.toString()}\r\n\
Content-Length: ${this.blockDigester.size}\r\n\
`);

    yield trailer;

    if (this.signer) {
      this.signer.update(trailer);
      yield encoder.encode(`WARC-Signature: ${this.signer.toString()}\r\n`);
    }

    yield CRLFCRLF;
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
}


export { SWARCSerializer, SWARCReader, SWARCParser };


