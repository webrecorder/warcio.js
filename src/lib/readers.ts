import pako from "pako";
import { type Source, type SourceReader } from "./types";
import { splitChunk, concatChunks } from "./utils";

const decoder = new TextDecoder("utf-8");

// ===========================================================================
export class NoConcatInflator<T extends BaseAsyncIterReader> extends pako.Inflate {
  reader: T;
  ended = false;
  chunks: Uint8Array[] = [];

  constructor(options: pako.InflateOptions, reader: T) {
    super(options);
    this.reader = reader;
  }

  override onEnd(status: pako.ReturnCodes) {
    this.err = status;
    if (!this.err) {
      // @ts-expect-error strm is not implemented in typescript types
      this.reader._rawOffset += this.strm.total_in;
    }
  }
}

// ===========================================================================
export abstract class BaseAsyncIterReader {
  static async readFully(iter: AsyncIterable<Uint8Array> | Iterable<Uint8Array>) : Promise<Uint8Array> {
    const chunks = [];
    let size = 0;

    for await (const chunk of iter) {
      chunks.push(chunk);
      size += chunk.byteLength;
    }

    return concatChunks(chunks, size);
  }

  abstract [Symbol.asyncIterator](): AsyncIterator<Uint8Array>;

  getReadableStream() {
    const streamIter = this[Symbol.asyncIterator]();

    return new ReadableStream({
      async pull(controller) {
        return streamIter.next().then((result) => {
          // all done;
          if (result.done || !result.value) {
            controller.close();
          } else {
            controller.enqueue(result.value);
          }
        });
      },
    });
  }

  async readFully(): Promise<Uint8Array> {
    return await BaseAsyncIterReader.readFully(this);
  }

  abstract readlineRaw(maxLength?: number): Promise<Uint8Array | null>;

  async readline(maxLength = 0) {
    const lineBuff = await this.readlineRaw(maxLength);
    return lineBuff ? decoder.decode(lineBuff) : "";
  }

  async *iterLines(maxLength = 0) {
    let line = null;

    while ((line = await this.readline(maxLength))) {
      yield line;
    }
  }
}


// ===========================================================================
export type AsyncIterReaderOpts = {
  raw: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- type guard
function isIterable(input: any): input is Iterable<Uint8Array> {
  return input && Symbol.iterator in Object(input);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- type guard
function isAsyncIterable(input: any): input is AsyncIterable<Uint8Array> {
  return input && Symbol.asyncIterator in Object(input);
}

// ===========================================================================
export class AsyncIterReader extends BaseAsyncIterReader {
  compressed!: string | null;
  opts!: AsyncIterReaderOpts;
  inflator!: NoConcatInflator<this> | null;

  _sourceIter: AsyncIterator<Uint8Array | null>;

  lastValue: Uint8Array | null;
  errored: boolean;
  _savedChunk: Uint8Array | null;
  _rawOffset: number;
  _readOffset: number;
  numChunks: number;

  constructor(
    streamOrIter: Source,
    compressed: string | null = "gzip",
    dechunk = false
  ) {
    super();
    this.compressed = compressed;
    this.opts = { raw: compressed === "deflateRaw" };

    this.inflator = compressed ? new NoConcatInflator(this.opts, this) : null;

    let source: AsyncIterable<Uint8Array>;
    if (isAsyncIterable(streamOrIter)) {
      source = streamOrIter;
    } else if (
      typeof streamOrIter === "object" &&
      "read" in streamOrIter &&
      typeof streamOrIter.read === "function"
    ) {
      source = AsyncIterReader.fromReadable(streamOrIter);
    } else if (streamOrIter instanceof ReadableStream) {
      source = AsyncIterReader.fromReadable(streamOrIter.getReader());
    } else if (isIterable(streamOrIter)) {
      source = AsyncIterReader.fromIter(streamOrIter);
    } else {
      throw new TypeError("Invalid Stream Source");
    }

    if (dechunk) {
      this._sourceIter = this.dechunk(source);
    } else {
      this._sourceIter = source[Symbol.asyncIterator]();
    }

    this.lastValue = null;

    this.errored = false;

    this._savedChunk = null;

    this._rawOffset = 0;
    this._readOffset = 0;

    this.numChunks = 0;
  }

  async _loadNext() {
    const res = await this._sourceIter.next();
    return !res.done ? res.value : null;
  }

  async *dechunk(
    source: AsyncIterable<Uint8Array>
  ): AsyncIterator<Uint8Array | null> {
    const reader =
      source instanceof AsyncIterReader
        ? source
        : new AsyncIterReader(source, null);

    let size = -1;
    let first = true;

    while (size != 0) {
      const lineBuff = await reader.readlineRaw(64);
      let chunk: Uint8Array = new Uint8Array();

      size = lineBuff ? parseInt(decoder.decode(lineBuff), 16) : 0;

      if (!size || size > 2 ** 32) {
        if (Number.isNaN(size) || size > 2 ** 32) {
          if (!first) {
            this.errored = true;
          }
          yield lineBuff;
          break;
        }
      } else {
        chunk = await reader.readSize(size);
        if (chunk.length != size) {
          if (!first) {
            this.errored = true;
          } else {
            yield lineBuff;
          }
          yield chunk;
          break;
        }
      }

      const sep = await reader.readSize(2);

      if (sep[0] != 13 || sep[1] != 10) {
        if (!first) {
          this.errored = true;
        } else {
          yield lineBuff;
        }
        yield chunk;
        yield sep;
        break;
      } else {
        first = false;
        if (!chunk || size === 0) {
          return;
        } else {
          yield chunk;
        }
      }
    }

    yield* reader;
  }

  unread(chunk: Uint8Array) {
    if (!chunk.length) {
      return;
    }

    this._readOffset -= chunk.length;

    /* istanbul ignore if */
    if (this._savedChunk) {
      console.log("Already have chunk!");
    }

    this._savedChunk = chunk;
  }

  async _next() {
    if (this._savedChunk) {
      const chunk = this._savedChunk;
      this._savedChunk = null;
      return chunk;
    }

    if (this.compressed) {
      const newValue = this._getNextChunk();
      if (newValue) {
        return newValue;
      }
    }

    let value = await this._loadNext();

    while (this.compressed && value) {
      this._push(value);

      const newValue = this._getNextChunk(value);
      if (newValue) {
        return newValue;
      }
      value = await this._loadNext();
    }

    return value;
  }

  _push(value: Uint8Array) {
    // only called if this.compressed is not null
    if (!this.inflator) {
      throw new Error(
        "AsyncIterReader cannot call _push when this.compressed is null"
      );
    }
    this.lastValue = value;

    if (this.inflator.ended) {
      this.inflator = new NoConcatInflator(this.opts, this);
    }
    this.inflator.push(value);

    // "deflate" allows automatically trying "deflateRaw", while "gzip" does not
    if (
      this.inflator.err &&
      this.inflator.ended &&
      this.compressed === "deflate" &&
      !this.opts.raw &&
      this.numChunks === 0
    ) {
      this.opts.raw = true;
      this.compressed = "deflateRaw";

      this.inflator = new NoConcatInflator(this.opts, this);
      this.inflator.push(value);
    }
  }

  _getNextChunk(original?: Uint8Array) {
    // only called if this.compressed is not null
    if (!this.inflator) {
      throw new Error(
        "AsyncIterReader cannot call _getNextChunk when this.compressed is null"
      );
    }
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (this.inflator.chunks.length > 0) {
        this.numChunks++;
        return this.inflator.chunks.shift();
      }

      if (this.inflator.ended) {
        if (this.inflator.err !== 0) {
          // assume not compressed
          this.compressed = null;
          return original;
        }

        // @ts-expect-error strm is not implemented in typescript types
        const avail_in = this.inflator.strm.avail_in;

        if (avail_in && this.lastValue) {
          this._push(this.lastValue.slice(-avail_in));
          continue;
        }
      }

      return null;
    }
  }

  async *[Symbol.asyncIterator]() {
    let chunk = null;
    while ((chunk = await this._next())) {
      this._readOffset += chunk.length;
      yield chunk;
    }
  }

  async readlineRaw(maxLength?: number) {
    const chunks = [];
    let size = 0;

    let inx = -1;

    let lastChunk = null;

    for await (const chunk of this) {
      if (maxLength && size + chunk.byteLength > maxLength) {
        lastChunk = chunk;
        inx = maxLength - size - 1;
        const lineInx = chunk.slice(0, inx + 1).indexOf(10);
        if (lineInx >= 0) {
          inx = lineInx;
        }
        break;
      }

      inx = chunk.indexOf(10);

      if (inx >= 0) {
        lastChunk = chunk;
        break;
      }

      chunks.push(chunk);
      size += chunk.byteLength;
    }

    if (lastChunk) {
      const [first, remainder] = splitChunk(lastChunk, inx + 1);
      chunks.push(first);
      size += first.byteLength;

      this.unread(remainder);
    } else if (!chunks.length) {
      return null;
    }

    return concatChunks(chunks, size);
  }

  override async readFully() : Promise<Uint8Array> {
    return (await this._readOrSkip())[1];
  }

  async readSize(sizeLimit: number) : Promise<Uint8Array> {
    return (await this._readOrSkip(sizeLimit))[1];
  }

  async skipSize(sizeLimit: number) : Promise<number> {
    return (await this._readOrSkip(sizeLimit, true))[0];
  }

  async _readOrSkip(sizeLimit = -1, skip = false) {
    const chunks: Uint8Array[] = [];
    let size = 0;

    //while ((res = await this._readiter.next()) && (chunk = res.value)) {
    for await (const chunk of this) {
      if (sizeLimit >= 0) {
        if (chunk.length > sizeLimit) {
          const [first, remainder] = splitChunk(chunk, sizeLimit);
          if (!skip) {
            chunks.push(first);
          }
          size += first.byteLength;
          this.unread(remainder);
          break;
        } else if (chunk.length === sizeLimit) {
          if (!skip) {
            chunks.push(chunk);
          }
          size += chunk.byteLength;
          sizeLimit = 0;
          break;
        } else {
          sizeLimit -= chunk.length;
        }
      }
      if (!skip) {
        chunks.push(chunk);
      }
      size += chunk.byteLength;
    }

    if (skip) {
      return [size, new Uint8Array()] as const;
    }
    return [size, concatChunks(chunks, size)] as const;
  }

  getReadOffset() {
    return this._readOffset;
  }

  getRawOffset() {
    return this.compressed ? this._rawOffset : this._readOffset;
  }

  getRawLength(prevOffset: number): number {
    if (this.compressed) {
      // @ts-expect-error strm is not implemented in typescript types
      return this.inflator.strm.total_in;
    }
    return this._readOffset - prevOffset;
  }

  static fromReadable<Readable extends SourceReader>(source: Readable) {
    const iterable = {
      async *[Symbol.asyncIterator]() {
        let res = null;

        while ((res = await source.read()) && !res.done) {
          yield res.value as Uint8Array;
        }
      },
    };

    return iterable;
  }

  static fromIter(source: Iterable<Uint8Array>) {
    const iterable = {
      async *[Symbol.asyncIterator]() {
        for (const chunk of source) {
          yield chunk;
        }
      },
    };

    return iterable;
  }
}

// ===========================================================================
export class LimitReader extends BaseAsyncIterReader {
  sourceIter!: AsyncIterReader;
  length!: number;
  limit!: number;
  skip!: number;

  constructor(streamIter: AsyncIterReader, limit: number, skip = 0) {
    super();
    this.sourceIter = streamIter;
    this.length = limit;
    this.limit = limit;
    this.skip = skip;
  }

  setLimitSkip(limit: number, skip = 0) {
    this.limit = limit;
    this.skip = skip;
  }

  async *[Symbol.asyncIterator]() {
    if (this.limit <= 0) {
      return;
    }

    for await (let chunk of this.sourceIter) {
      if (this.skip > 0) {
        if (chunk.length >= this.skip) {
          const [, /*first*/ remainder] = splitChunk(chunk, this.skip);
          chunk = remainder;
          this.skip = 0;
        } else {
          this.skip -= chunk.length;
          continue;
        }
      }

      if (chunk.length > this.limit) {
        const [first, remainder] = splitChunk(chunk, this.limit);
        chunk = first;

        if (this.sourceIter.unread) {
          this.sourceIter.unread(remainder);
        }
      }

      if (chunk.length) {
        this.limit -= chunk.length;

        yield chunk;
      }

      if (this.limit <= 0) {
        break;
      }
    }
  }

  async readlineRaw(maxLength?: number) {
    if (this.limit <= 0) {
      return null;
    }

    const result = await this.sourceIter.readlineRaw(
      maxLength ? Math.min(maxLength, this.limit) : this.limit
    );
    this.limit -= result?.length || 0;
    return result;
  }

  async skipFully() {
    const origLimit = this.limit;

    while (this.limit > 0) {
      this.limit -= await this.sourceIter.skipSize(this.limit);
    }

    return origLimit;
  }
}

