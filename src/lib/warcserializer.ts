//import base32 from "hi-base32";
import base32Encode from "base32-encode";
import pako from "pako";

import { createSHA256, createSHA1 } from "hash-wasm";
import { type IHasher } from "hash-wasm/dist/lib/WASMInterface.js";

import { type WARCRecord } from "./warcrecord";
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
  preferPako?: boolean;
};

// ===========================================================================
/* Base class for custom buffering while serializing */
export abstract class BaseSerializerBuffer {
  abstract write(chunk: Uint8Array): void;
  abstract readAll(): AsyncIterable<Uint8Array>;
  abstract purge(): void;
}

// ===========================================================================
export class SerializerInMemBuffer extends BaseSerializerBuffer {
  buffers: Uint8Array[] = [];

  write(chunk: Uint8Array): void {
    this.buffers.push(chunk);
  }

  async *readAll(): AsyncIterable<Uint8Array> {
    for (const buff of this.buffers) {
      yield buff;
    }
  }

  purge() {
    this.buffers = [];
  }
}

// ===========================================================================
export class WARCSerializer extends BaseAsyncIterReader {
  gzip = false;

  digestAlgo: AlgorithmIdentifier = "";
  digestAlgoPrefix = "";
  digestBase32 = false;
  preferPako = false;

  record: WARCRecord;

  externalBuffer: BaseSerializerBuffer | undefined;
  _alreadyDigested = false;

  blockHasher: IHasher | null = null;
  payloadHasher: IHasher | null = null;

  httpHeadersBuff: Uint8Array | null = null;
  warcHeadersBuff: Uint8Array | null = null;

  static async serialize(
    record: WARCRecord,
    opts?: WARCSerializerOpts,
    externalBuffer: BaseSerializerBuffer = new SerializerInMemBuffer(),
  ) {
    const s = new WARCSerializer(record, opts, externalBuffer);
    return await s.readFully();
  }

  constructor(
    record: WARCRecord,
    opts: WARCSerializerOpts = {},
    externalBuffer: BaseSerializerBuffer = new SerializerInMemBuffer(),
  ) {
    super();
    this.gzip = Boolean(opts.gzip);

    this.record = record;

    const digestOpts = opts.digest || {};
    this.digestAlgo = digestOpts.algo || "sha-256";
    this.digestAlgoPrefix = digestOpts.prefix || "sha256:";
    this.digestBase32 = Boolean(digestOpts.base32);
    this.preferPako = Boolean(opts.preferPako);

    if (WARCSerializer.noComputeDigest(record)) {
      this.digestAlgo = "";
    }

    this.externalBuffer = externalBuffer;
  }

  static noComputeDigest(record: WARCRecord) {
    return (
      record.warcType === "revisit" ||
      record.warcType === "warcinfo" ||
      (record.warcPayloadDigest && record.warcBlockDigest)
    );
  }

  async *[Symbol.asyncIterator]() {
    if (!this.gzip) {
      yield* this.generateRecord();
      return;
    }

    if ("CompressionStream" in globalThis && !this.preferPako) {
      const cs = new globalThis.CompressionStream("gzip");
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

    let res: ReadableStreamReadResult<Uint8Array> | null = null;

    const reader = cs.readable.getReader();

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while ((res = await reader.read()) && !res.done) {
      yield res.value;
    }
  }

  async newHasher() {
    switch (this.digestAlgo) {
      case "sha-256":
        return createSHA256();

      case "sha-1":
        return createSHA1();

      case "":
        return null;

      default:
        return createSHA256();
    }
  }

  getDigest(hasher: IHasher) {
    return (
      this.digestAlgoPrefix +
      (this.digestBase32
        ? base32Encode(hasher.digest("binary"), "RFC4648")
        : hasher.digest("hex"))
    );
  }

  async digestRecord() {
    const record = this.record;

    if (this._alreadyDigested) {
      return Number(record.warcHeaders.headers.get("Content-Length"));
    }

    const blockHasher = await this.newHasher();
    const payloadHasher = await this.newHasher();

    let size = 0;

    if (record.httpHeaders) {
      this.httpHeadersBuff = encoder.encode(
        record.httpHeaders.toString() + "\r\n",
      );
      size += this.httpHeadersBuff.length;

      blockHasher?.update(this.httpHeadersBuff);
    }

    for await (const chunk of record.reader) {
      blockHasher?.update(chunk);
      payloadHasher?.update(chunk);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.externalBuffer!.write(chunk);

      size += chunk.length;
    }

    if (payloadHasher) {
      record.warcHeaders.headers.set(
        "WARC-Payload-Digest",
        this.getDigest(payloadHasher),
      );
    }

    if (blockHasher) {
      record.warcHeaders.headers.set(
        "WARC-Block-Digest",
        this.getDigest(blockHasher),
      );
    }

    record.warcHeaders.headers.set("Content-Length", size.toString());

    this.warcHeadersBuff = encoder.encode(record.warcHeaders.toString());

    this._alreadyDigested = true;

    return size;
  }

  async *generateRecord() {
    await this.digestRecord();

    if (this.warcHeadersBuff) {
      yield this.warcHeadersBuff;
    }

    yield CRLF;

    if (this.httpHeadersBuff) {
      yield this.httpHeadersBuff;
    }

    if (this.externalBuffer) {
      for await (const chunk of this.externalBuffer.readAll()) {
        yield chunk;
      }
    }

    yield CRLFCRLF;
  }
}
