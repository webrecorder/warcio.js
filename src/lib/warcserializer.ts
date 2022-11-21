import base32 from "hi-base32";
import { Deflate } from "pako";

import { WARCRecord } from "./warcrecord";
import { BaseAsyncIterReader } from "./readers";
import { CRLF, CRLFCRLF } from "./statusandheaders";
import { CompressionStream } from "stream/web";
import { concatChunks } from "./utils";

const encoder = new TextEncoder();

// ===========================================================================
type WARCSerializerOpts = {
  gzip?: boolean;
  digest?: {
    algo?: AlgorithmIdentifier;
    prefix?: string;
    base32?: boolean;
  };
};
export class WARCSerializer extends BaseAsyncIterReader {
  static async serialize(record: WARCRecord, opts?: WARCSerializerOpts) {
    const s = new WARCSerializer(record, opts);
    return await s.readFully();
  }

  static base16(hashBuffer: ArrayBuffer) {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  record: WARCRecord;
  gzip = false;
  digestAlgo: AlgorithmIdentifier = "";
  digestAlgoPrefix = "";
  digestBase32 = false;

  constructor(record: WARCRecord, opts: WARCSerializerOpts = {}) {
    super();
    this.record = record;
    this.gzip = Boolean(opts.gzip);

    const digestOpts = (opts && opts.digest) || {};

    if (
      record.warcType !== "revisit" &&
      record.warcType !== "warcinfo" &&
      (!record.warcPayloadDigest || !record.warcBlockDigest)
    ) {
      this.digestAlgo = digestOpts?.algo || "sha-256";
      this.digestAlgoPrefix = digestOpts?.prefix || "sha256:";
      this.digestBase32 = Boolean(digestOpts?.base32);
    } else {
      this.digestAlgo = "";
    }
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
    const deflater = new Deflate({ gzip: true });

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

  async digestMessage(chunk: BufferSource) {
    const hashBuffer = await crypto.subtle.digest(this.digestAlgo, chunk);
    return (
      this.digestAlgoPrefix +
      (this.digestBase32
        ? base32.encode(hashBuffer)
        : WARCSerializer.base16(hashBuffer))
    );
  }

  async *generateRecord() {
    let size = 0;

    let httpHeadersBuff: Uint8Array | null = null;

    if (this.record.httpHeaders) {
      httpHeadersBuff = encoder.encode(
        this.record.httpHeaders.toString() + "\r\n"
      );
      size += httpHeadersBuff.length;
    }

    const payload = await this.record.readFully();
    size += payload.length;

    // if digestAlgo is set, compute digests, otherwise only content-length
    if (this.digestAlgo) {
      const payloadDigest = await this.digestMessage(payload);
      /* eslint-disable indent -- offsetTernaryExpressions is broken */
      const blockDigest = httpHeadersBuff
        ? await this.digestMessage(
            concatChunks([httpHeadersBuff, payload], size)
          )
        : payloadDigest;
      /* eslint-enable indent */

      this.record.warcHeaders.headers.set("WARC-Payload-Digest", payloadDigest);
      this.record.warcHeaders.headers.set("WARC-Block-Digest", blockDigest);
    }

    this.record.warcHeaders.headers.set("Content-Length", size.toString());

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
