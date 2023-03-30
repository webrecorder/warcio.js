import base32Encode from "base32-encode";
import { createSHA1, createSHA256 } from "hash-wasm";
import { IHasher } from "hash-wasm/dist/lib/WASMInterface";

import { WARCRecord } from "./warcrecord";
import { CRLF, CRLFCRLF } from "./statusandheaders";

import { BaseWARCSerializer, WARCSerializerOpts } from "./warcserializer";

const encoder = new TextEncoder();

// ===========================================================================
export abstract class WARCRecordBuffer {
  abstract write(chunk: Uint8Array): void;
  abstract readAll() : AsyncIterable<Uint8Array>;
}

// ===========================================================================
export class StreamingWARCSerializer extends BaseWARCSerializer {
  recordBuffer: WARCRecordBuffer;
  blockHasher: IHasher | null = null;
  payloadHasher: IHasher | null = null;

  httpHeadersBuff: Uint8Array | null = null;
  warcHeadersBuff: Uint8Array | null = null;

  memBuff: Array<Uint8Array> = [];
  externalBuffUsed = false;

  _initing: Promise<void>;

  constructor(recordBuffer: WARCRecordBuffer, opts: WARCSerializerOpts = {}) {
    super(opts);

    this.recordBuffer = recordBuffer;
    this._initing = this.init();
  }

  async init() {
    if (this.digestAlgo === "sha-256") {
      this.blockHasher = await createSHA256();
      this.payloadHasher = await createSHA256();
    } else {
      this.blockHasher = await createSHA1();
      this.payloadHasher = await createSHA1();
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

  async bufferRecord(record: WARCRecord, inMemoryMaxSize = 10000000) {
    await this._initing;

    let size = 0;

    this.blockHasher?.init();
    this.payloadHasher?.init();

    if (record.httpHeaders) {
      this.httpHeadersBuff = encoder.encode(
        record.httpHeaders.toString() + "\r\n"
      );
      size += this.httpHeadersBuff.length;

      this.blockHasher?.update(this.httpHeadersBuff);
    }

    let memBuffSize = 0;
    this.externalBuffUsed = false;

    for await (const chunk of record.reader) {
      this.blockHasher?.update(chunk);
      this.payloadHasher?.update(chunk);

      if ((memBuffSize + chunk.length) < inMemoryMaxSize) {
        this.memBuff.push(chunk);
        memBuffSize += chunk.length;
      } else {
        this.externalBuffUsed = true;
        await this.recordBuffer.write(chunk);
      }

      size += chunk.length;
    }

    if (this.payloadHasher) {
      record.warcHeaders.headers.set("WARC-Payload-Digest", this.getDigest(this.payloadHasher));
    }

    if (this.blockHasher) {
      record.warcHeaders.headers.set("WARC-Block-Digest", this.getDigest(this.blockHasher));
    }

    record.warcHeaders.headers.set("Content-Length", size.toString());

    this.warcHeadersBuff = encoder.encode(record.warcHeaders.toString());
  }

  override async *generateRecord() {
    if (this.warcHeadersBuff) {
      yield this.warcHeadersBuff;
    }

    yield CRLF;

    if (this.httpHeadersBuff) {
      yield this.httpHeadersBuff;
    }

    for (const chunk of this.memBuff) {
      yield chunk;
    }

    if (this.externalBuffUsed) {
      for await (const chunk of this.recordBuffer.readAll()) {
        yield chunk;
      }
    }

    yield CRLFCRLF;
  }
}
