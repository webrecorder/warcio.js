//import base32 from "hi-base32";
import base32Encode from "base32-encode";
import pako from "pako";

import { WARCRecord } from "./warcrecord";
import { BaseAsyncIterReader } from "./readers";
import { CRLF, CRLFCRLF } from "./statusandheaders";

const encoder = new TextEncoder();

// ===========================================================================
export type WARCSerializerOpts = {
  gzip?: boolean;
  digest?: {
    algo?: AlgorithmIdentifier;
    prefix?: string;
    base32?: boolean;
  };
};

// ===========================================================================
export class BaseWARCSerializer extends BaseAsyncIterReader
{
  gzip = false;
  digestAlgo: AlgorithmIdentifier = "";
  digestAlgoPrefix = "";
  digestBase32 = false;
  record: WARCRecord;

  constructor(record: WARCRecord, opts : WARCSerializerOpts = {}) {
    super();
    this.gzip = Boolean(opts.gzip);

    this.record = record;

    const digestOpts = (opts && opts.digest) || {};
    this.digestAlgo = digestOpts?.algo || "sha-256";
    this.digestAlgoPrefix = digestOpts?.prefix || "sha256:";
    this.digestBase32 = Boolean(digestOpts?.base32);

    if (BaseWARCSerializer.noComputeDigest(record)) {
      this.digestAlgo = "";
    }
  }

  static noComputeDigest(record: WARCRecord) {
    return record.warcType === "revisit" ||
           record.warcType === "warcinfo" ||
      (record.warcPayloadDigest && record.warcBlockDigest);
  }

  async *generateRecord() : AsyncGenerator<Uint8Array> {
    throw new Error("Not Implemented");
    yield new Uint8Array();
  }

  async *[Symbol.asyncIterator]() {
    if (!this.gzip) {
      yield* this.generateRecord();
      return;
    }

    let cs = null;

    if ("CompressionStream" in globalThis) {
      cs = new globalThis.CompressionStream("gzip");
      yield* this.streamCompress(cs);
    } else {
      yield* this.pakoCompress();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override async readlineRaw(maxLength?: number): Promise<Uint8Array | null> {
    return null;
  }
  
  async *pakoCompress() {
    const deflater = new pako.Deflate({ gzip: true });
  
    let lastChunk: Uint8Array | null = null;
  
    for await (const chunk of this.generateRecord()) {
      if (lastChunk && lastChunk.length > 0) {
        deflater.push(lastChunk);
      }
      lastChunk = chunk;
  
      // @ts-expect-error Deflate has property chunks in implementation
      while (deflater.chunks.length) {
        // @ts-expect-error Deflate has property chunks in implementation
        yield deflater.chunks.shift();
      }
    }
  
    if (lastChunk) {
      deflater.push(lastChunk, true);
    }
    yield deflater.result;
  }
  
  async *streamCompress(cs: CompressionStream) {
    const recordIter = this.generateRecord();
  
    const source = new ReadableStream({
      async pull(controller) {
        const res = await recordIter.next();
        if (!res.done) {
          controller.enqueue(res.value);
        } else {
          controller.close();
        }
      },
    });
  
    source.pipeThrough(cs);
  
    let res = null;
  
    const reader = cs.readable.getReader();
  
    while ((res = await reader.read()) && !res.done) {
      yield res.value;
    }
  }
  
}

// ===========================================================================
export class WARCSerializer extends BaseWARCSerializer {
  static async serialize(record: WARCRecord, opts?: WARCSerializerOpts) {
    const s = new WARCSerializer(record, opts);
    return await s.readFully();
  }

  static base16(hashBuffer: ArrayBuffer) {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async digestMessage(chunk: BufferSource) {
    const hashBuffer = await crypto.subtle.digest(this.digestAlgo, chunk);
    return (
      this.digestAlgoPrefix +
      (this.digestBase32
        ? base32Encode(hashBuffer, "RFC4648")
        : WARCSerializer.base16(hashBuffer))
    );
  }

  override async *generateRecord() : AsyncGenerator<Uint8Array> {
    let size = 0;

    let httpHeadersBuff: Uint8Array | null = null;

    let payloadOffset = 0;

    if (this.record.httpHeaders) {
      httpHeadersBuff = encoder.encode(
        this.record.httpHeaders.toString() + "\r\n"
      );

      payloadOffset = httpHeadersBuff.length;
    }

    const headersAndPayload = await this.record.readFully(false, httpHeadersBuff ? [httpHeadersBuff] : []);
    size += headersAndPayload.length;

    // if digestAlgo is set, compute digests, otherwise only content-length
    if (this.digestAlgo) {
      const blockDigest = await this.digestMessage(headersAndPayload);
      const payloadDigest = payloadOffset > 0 ? 
        await this.digestMessage(headersAndPayload.slice(payloadOffset)) : 
        blockDigest;

      this.record.warcHeaders.headers.set("WARC-Payload-Digest", payloadDigest);
      this.record.warcHeaders.headers.set("WARC-Block-Digest", blockDigest);
    }

    this.record.warcHeaders.headers.set("Content-Length", size.toString());

    const warcHeadersBuff = encoder.encode(this.record.warcHeaders.toString());

    yield warcHeadersBuff;
    yield CRLF;

    yield headersAndPayload;

    yield CRLFCRLF;
  }
}
