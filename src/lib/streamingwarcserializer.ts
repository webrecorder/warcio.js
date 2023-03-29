import base32Encode from "base32-encode";
import { createSHA1, createSHA256 } from "hash-wasm";
import { IHasher } from "hash-wasm/dist/lib/WASMInterface";

import { WARCRecord } from "./warcrecord";
import { CRLF, CRLFCRLF } from "./statusandheaders";

import { WARCSerializer, WARCSerializerOpts } from "./warcserializer";

const encoder = new TextEncoder();

// ===========================================================================
export abstract class WARCRecordBuffer {
  async write(chunk: Uint8Array) {}
  async* readAll() : AsyncIterable<Uint8Array> {}
}

export class StreamingWARCSerializer extends WARCSerializer {
  recordBuffer: WARCRecordBuffer;
  blockHasher: IHasher | null = null;
  payloadHasher: IHasher | null = null;

  httpHeadersBuff: Uint8Array | null = null;
  warcHeadersBuff: Uint8Array | null = null;

  constructor(record: WARCRecord, recordBuffer: WARCRecordBuffer, opts: WARCSerializerOpts = {}) {
    super(record, opts);

    this.recordBuffer = recordBuffer;
  }

  getDigest(hasher: IHasher) {
    return (
      this.digestAlgoPrefix + 
      (this.digestBase32
        ? base32Encode(hasher.digest("binary"), "RFC4648")
        : hasher.digest("hex"))
    );
  }

  async bufferRecord() {
    let size = 0;

    if (this.digestAlgo === "sha-256") {
      this.blockHasher = await createSHA256();
      this.payloadHasher = await createSHA256();
    } else {
      this.blockHasher = await createSHA1();
      this.payloadHasher = await createSHA1();
    }

    this.blockHasher?.init();
    this.payloadHasher?.init();

    if (this.record.httpHeaders) {
      this.httpHeadersBuff = encoder.encode(
        this.record.httpHeaders.toString() + "\r\n"
      );
      size += this.httpHeadersBuff.length;

      this.blockHasher?.update(this.httpHeadersBuff);
    }

    for await (const chunk of this.record) {
      this.blockHasher?.update(chunk);
      this.payloadHasher?.update(chunk);

      await this.recordBuffer.write(chunk);

      size += chunk.length;
    }

    for await (const chunk of this.record) {
      this.blockHasher?.update(chunk);
      this.payloadHasher?.update(chunk);

      await this.recordBuffer.write(chunk);

      size += chunk.length;
    }

    if (this.payloadHasher) {
      this.record.warcHeaders.headers.set("WARC-Payload-Digest", this.getDigest(this.payloadHasher));
    }

    if (this.blockHasher) {
      this.record.warcHeaders.headers.set("WARC-Block-Digest", this.getDigest(this.blockHasher));
    }

    this.record.warcHeaders.headers.set("Content-Length", size.toString());

    this.warcHeadersBuff = encoder.encode(this.record.warcHeaders.toString());
  }

  override async *generateRecord() {
    if (this.warcHeadersBuff) {
      yield this.warcHeadersBuff;
    }

    yield CRLF;

    if (this.httpHeadersBuff) {
      yield this.httpHeadersBuff;
    }

    for await (const chunk of this.recordBuffer.readAll()) {
      yield chunk;
    }

    yield CRLFCRLF;
  }
}
