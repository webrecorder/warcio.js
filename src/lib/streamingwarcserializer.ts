import base32Encode from "base32-encode";
import { createSHA1, createSHA256 } from "hash-wasm";
import { IHasher } from "hash-wasm/dist/lib/WASMInterface";

import { WARCRecord } from "./warcrecord";
import { CRLF, CRLFCRLF } from "./statusandheaders";

import { BaseWARCSerializer } from "./warcserializer";

const encoder = new TextEncoder();

// ===========================================================================
export abstract class WARCRecordBuffer {
  abstract write(chunk: Uint8Array): void;
  abstract readAll() : AsyncIterable<Uint8Array>;
}

// ===========================================================================
export class StreamingWARCSerializer extends BaseWARCSerializer {
  externalBuffer: WARCRecordBuffer | null = null;

  blockHasher: IHasher | null = null;
  payloadHasher: IHasher | null = null;

  httpHeadersBuff: Uint8Array | null = null;
  warcHeadersBuff: Uint8Array | null = null;

  newHasher() {
    switch (this.digestAlgo) {
      case "sha-256":
        return createSHA256();

      case "sha-1":
        return createSHA1();

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

  async bufferRecord(record: WARCRecord, externalBuffer: WARCRecordBuffer) {
    const blockHasher = await this.newHasher();
    const payloadHasher = await this.newHasher();
  
    let size = 0;

    if (record.httpHeaders) {
      this.httpHeadersBuff = encoder.encode(
        record.httpHeaders.toString() + "\r\n"
      );
      size += this.httpHeadersBuff.length;

      blockHasher?.update(this.httpHeadersBuff);
    }

    this.externalBuffer = externalBuffer;

    for await (const chunk of record.reader) {
      blockHasher?.update(chunk);
      payloadHasher?.update(chunk);

      await externalBuffer.write(chunk);

      size += chunk.length;
    }

    if (payloadHasher) {
      record.warcHeaders.headers.set("WARC-Payload-Digest", this.getDigest(payloadHasher));
    }

    if (blockHasher) {
      record.warcHeaders.headers.set("WARC-Block-Digest", this.getDigest(blockHasher));
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

    if (this.externalBuffer) {
      for await (const chunk of this.externalBuffer.readAll()) {
        yield chunk;
      }
    }

    yield CRLFCRLF;
  }
}
