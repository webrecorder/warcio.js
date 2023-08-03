import fs, { WriteStream } from "node:fs";
import { unlink } from "node:fs/promises";

import { temporaryFile } from "tempy";

import { StreamingInMemBuffer } from "./streambuffer";

import { WARCRecord } from "./warcrecord";
import { WARCSerializer, WARCSerializerOpts } from "./warcserializer";

export const DEFAULT_MEM_SIZE = 1024 * 256;


// ===========================================================================
export class TempFileBuffer extends StreamingInMemBuffer
{
  memSize: number;
  currSize = 0;
  fh: WriteStream | null = null;
  filename = "";

  constructor(memSize = DEFAULT_MEM_SIZE) {
    super();
    this.memSize = memSize;
  }

  override write(chunk: Uint8Array): void {
    if ((this.currSize + chunk.length) <= this.memSize) {
      this.buffers.push(chunk);
    } else {
      if (!this.fh) {
        this.filename = temporaryFile();
        this.fh = fs.createWriteStream(this.filename);
      }
      this.fh.write(chunk);
    }
    this.currSize += chunk.length;
  }

  override async* readAll(): AsyncIterable<Uint8Array> {
    for (const buff of this.buffers) {
      yield buff;
    }

    if (!this.fh) {
      return;
    }

    await streamFinish(this.fh);
    this.fh = null;

    const reader = fs.createReadStream(this.filename);
    for await (const buff of reader) {
      yield buff;
    }

    await unlink(this.filename);
  }
}

export function streamFinish(fh: WriteStream) {
  const p = new Promise<void>(resolve => {
    fh.once("finish", () => resolve());
  });
  fh.end();
  return p;
}

// ===========================================================================
export type WARCSerializerTempBufferOpts = WARCSerializerOpts & {
  maxMemSize?: number;
};

// ===========================================================================
export class WARCSerializerTempBuffer extends WARCSerializer {
  constructor(record: WARCRecord, opts : WARCSerializerTempBufferOpts = {}) {
    super(record, opts, new TempFileBuffer(opts.maxMemSize || DEFAULT_MEM_SIZE));
  }
}

