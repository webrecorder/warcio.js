// ===========================================================================
export abstract class StreamingBufferIO {
  abstract write(chunk: Uint8Array): void;
  abstract readAll() : AsyncIterable<Uint8Array>;
}

// ===========================================================================
export class StreamingInMemBuffer extends StreamingBufferIO
{
  buffers: Array<Uint8Array> = [];

  write(chunk: Uint8Array): void {
    this.buffers.push(chunk);
  }

  async* readAll(): AsyncIterable<Uint8Array> {
    for (const buff of this.buffers) {
      yield buff;
    }
  }
}
