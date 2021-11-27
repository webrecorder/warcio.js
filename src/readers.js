/*eslint no-constant-condition: ["error", { "checkLoops": false }]*/

import { Inflate } from "pako/lib/inflate";

import { splitChunk, concatChunks } from "./utils";

const decoder = new TextDecoder("utf-8");


// ===========================================================================
class NoConcatInflator extends Inflate
{
  constructor(options, reader) {
    super(options);
    this.reader = reader;
  }

  onEnd(status) {
    this.err = status;
    if (!this.err) {
      this.reader._rawOffset += this.strm.total_in;
    }
  } 
}


// ===========================================================================
class BaseAsyncIterReader
{

  static async readFully(iter) {
    const chunks = [];
    let size = 0;

    for await (const chunk of iter) {
      chunks.push(chunk);
      size += chunk.byteLength;
    }

    return concatChunks(chunks, size);
  }



  getReadableStream() {
    const streamIter = this[Symbol.asyncIterator]();

    return new ReadableStream({
      pull(controller) {
        return streamIter.next().then((result) => {
          // all done;
          if (result.done || !result.value) {
            controller.close();
          } else {
            controller.enqueue(result.value);
          }
        });
      }
    });
  }

  readFully() {
    return BaseAsyncIterReader.readFully(this);
  }

  async readline(maxLength = 0) {
    const lineBuff = await this.readlineRaw(maxLength);
    return lineBuff ? decoder.decode(lineBuff) : "";
  }

  async* iterLines(maxLength = 0) {
    let line = null;

    while ((line = await this.readline(maxLength))) {
      yield line;
    }
  }
}


// ===========================================================================
class AsyncIterReader extends BaseAsyncIterReader {
  constructor(streamOrIter, compressed = "gzip", dechunk = false) {
    super();
    this.compressed = compressed;
    this.opts = {raw: compressed === "deflateRaw"};

    this.inflator = compressed ? new NoConcatInflator(this.opts, this) : null;

    if (typeof(streamOrIter[Symbol.asyncIterator]) !== "function") {
      if (typeof(streamOrIter.getReader) === "function") {
        streamOrIter = AsyncIterReader.fromReadable(streamOrIter.getReader());
      } else if (typeof(streamOrIter.read) === "function") {
        streamOrIter = AsyncIterReader.fromReadable(streamOrIter);
      } else if (typeof(streamOrIter[Symbol.iterator]) === "function") {
        streamOrIter = AsyncIterReader.fromIter(streamOrIter);
      } else {
        throw new TypeError("Invalid Stream Source");
      }
    }

    if (dechunk) {
      this._sourceIter = this.dechunk(streamOrIter);
    } else {
      this._sourceIter = streamOrIter[Symbol.asyncIterator]();
    }

    this.lastValue = null;

    this.errored = false;

    this._savedChunk = null;

    this._rawOffset = 0;
    this._readOffset = 0;

    this.numChunks = 0;
  }

  async _loadNext()  {
    const res = await this._sourceIter.next();
    return !res.done ? res.value : null;
  }

  async* dechunk(source) {
    const reader = (source instanceof AsyncIterReader) ? source : new AsyncIterReader(source, null);

    let size = -1;
    let first = true;

    while (size != 0) {
      const lineBuff = await reader.readlineRaw(64);
      let chunk = null;

      size = lineBuff ? parseInt(decoder.decode(lineBuff), 16) : 0;

      if (!size || size > 2**32) {
        if (Number.isNaN(size) || size > 2**32) {
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

    yield *reader;
  }

  unread(chunk) {
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

  _push(value) {
    this.lastValue = value;

    if (this.inflator.ended) {
      this.inflator = new NoConcatInflator(this.opts, this);
    }
    this.inflator.push(value);

    // "deflate" allows automatically trying "deflateRaw", while "gzip" does not
    if (this.inflator.err && this.inflator.ended && this.compressed === "deflate" &&
        this.opts.raw === false && this.numChunks === 0) {
      this.opts.raw = true;
      this.compressed = "deflateRaw";

      this.inflator = new NoConcatInflator(this.opts, this);
      this.inflator.push(value);
    }
  }

  _getNextChunk(original) {
    while (true) {
      if (this.inflator.chunks.length > 0) {
        this.numChunks++;
        return this.inflator.chunks.shift();
      }

      if (this.inflator.ended) {
        if (this.inflator.err !== 0)  {          
          // assume not compressed
          this.compressed = null;
          return original;
        }

        const avail_in = this.inflator.strm.avail_in;

        if (avail_in && this.lastValue) {
          this._push(this.lastValue.slice(-avail_in));
          continue;
        }
      }

      return null;
    }
  }

  async* [Symbol.asyncIterator]() {
    let chunk = null;
    while ((chunk = await this._next())) {
      this._readOffset += chunk.length;
      yield chunk;
    }
  }

  async readlineRaw(maxLength) {
    const chunks = [];
    let size = 0;

    let inx;

    let lastChunk = null;

    for await (const chunk of this) {
      if (maxLength && (size + chunk.byteLength) > maxLength) {
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

  readFully() {
    return this.readSize();
  }

  async readSize(sizeLimit = -1, skip = false) {
    const chunks = [];
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

    return skip ? size : concatChunks(chunks, size);
  }

  getReadOffset() {
    return this._readOffset;
  }

  getRawOffset() {
    return this.compressed ? this._rawOffset : this._readOffset;
  }

  getRawLength(prevOffset) {
    return this.compressed ? this.inflator.strm.total_in : this._readOffset - prevOffset;
  }

  static fromReadable(source) {
    const iterable = {
      async* [Symbol.asyncIterator]() {
        let res = null;

        while ((res = await source.read()) && !res.done) {
          yield res.value;
        }
      }
    };

    return iterable;
  }

  static fromIter(source) {
    const iterable = {
      async* [Symbol.asyncIterator]() {
        for (const chunk of source) {
          yield chunk;
        }
      }
    };

    return iterable;
  }
}


// ===========================================================================
class LimitReader extends BaseAsyncIterReader
{
  constructor(streamIter, limit, skip = 0) {
    super();
    this.sourceIter = streamIter;
    this.length = limit;
    this.limit = limit;
    this.skip = skip;
  }

  setLimitSkip(limit, skip = 0) {
    this.limit = limit;
    this.skip = skip;
  }

  async* [Symbol.asyncIterator]() {
    if (this.limit <= 0) {
      return;
    }

    for await (let chunk of this.sourceIter) {
      if (this.skip > 0) {
        if (chunk.length >= this.skip) {
          const [/*first*/, remainder] = splitChunk(chunk, this.skip);
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

  async readlineRaw(maxLength) {
    if (this.limit <= 0) {
      return null;
    }

    const result = await this.sourceIter.readlineRaw(maxLength ? Math.min(maxLength, this.limit) : this.limit);
    this.limit -= result.length;
    return result;
  }

  async skipFully() {
    const origLimit = this.limit;

    while (this.limit > 0) {
      this.limit -= await this.sourceIter.readSize(this.limit, true);
    }

    return origLimit;
  }
}


// ===========================================================================
export { BaseAsyncIterReader, AsyncIterReader, LimitReader };

