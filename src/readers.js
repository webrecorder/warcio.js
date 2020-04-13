import { Inflate } from 'pako/lib/inflate'


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

  static concatChunks(chunks, size) {
    if (chunks.length === 1) {
      return chunks[0];
    }
    const buffer = new Uint8Array(size);

    let offset = 0;

    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return buffer;
  }

  static splitChunk(chunk, inx) {
    return [chunk.slice(0, inx), chunk.slice(inx)];
  }

  getReadableStream(iterable) {
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
}


// ===========================================================================
class AsyncIterReader extends BaseAsyncIterReader {
  constructor(streamOrIter, compressed = "gzip") {
    super();
    this.compressed = compressed;
    this.opts = {raw: compressed === "deflateRaw"};

    this.inflator = compressed ? new NoConcatInflator(this.opts, this) : null;

    if (typeof(streamOrIter[Symbol.asyncIterator]) !== "function") {
      if (typeof(streamOrIter.getReader) === "function") {
        streamOrIter = AsyncIterReader.fromReadable(streamOrIter.getReader());
      } else if (typeof(streamOrIter.read) === "function") {
        streamOrIter = AsyncIterReader.fromReadable(streamOrIter);
      } else {
        throw new TypeError("Invalid Stream Source");
      }
    }

    this._sourceIter = streamOrIter[Symbol.asyncIterator]();

    this.lastValue = null;

    this.decoder = new TextDecoder("utf-8");

    this._savedChunk = null;

    this._rawOffset = 0;
    this._readOffset = 0;

    this.numChunks = 0;
  }

  async _loadNext()  {
    const res = await this._sourceIter.next();
    return !res.done ? res.value : null;
  }

  _unread(chunk) {
    if (!chunk.length) {
      return;
    }

    this._readOffset -= chunk.length;

    /* istanbul ignore if */
    if (this._savedChunk) {
      console.log('Already have chunk!');
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
    while (chunk = await this._next()) {
      this._readOffset += chunk.length;
      yield chunk;
    }
  }

  async* iterLines() {
    let chunks = [];
    let size = 0;

    let res;
    let chunk;

    //while ((res = await this._readiter.next()) && (chunk = res.value)) {
    for await (const chunk of this) {
      const inx = chunk.indexOf(10);

      if (inx < 0) {
        chunks.push(chunk);
        size += chunk.byteLength;
        continue;
      }

      const [first, remainder] = AsyncIterReader.splitChunk(chunk, inx + 1);
      chunks.push(first);
      size += first.byteLength;

      this._unread(remainder);
  
      const buff = AsyncIterReader.concatChunks(chunks, size);
      //this._readOffset += size;

      yield this.decoder.decode(buff);

      size = 0;
      chunks = [];
    }

    if (chunks.length) {
      const buff = AsyncIterReader.concatChunks(chunks, size);
      //this._readOffset += size;

      yield this.decoder.decode(buff);
    }
  }

  async readline() {
    for await (const line of this.iterLines()) {
      return line;
    }
    return "";
  }

  readFully() {
    return this.readSize();
  }

  async readSize(sizeLimit = -1, skip = false) {
    const chunks = [];
    let size = 0;

    let res;
    let chunk;

    //while ((res = await this._readiter.next()) && (chunk = res.value)) {
    for await (const chunk of this) {
      if (sizeLimit >= 0) {
        if (chunk.length > sizeLimit) {
          const [first, remainder] = AsyncIterReader.splitChunk(chunk, sizeLimit);
          if (!skip) {
            chunks.push(first);
          }
          size += first.byteLength;
          //this._savedChunk = remainder;
          this._unread(remainder);
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

    //this._readOffset += size;

    return skip ? size : AsyncIterReader.concatChunks(chunks, size);
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
    }

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
    if (this.limit === 0) {
      return;
    }

    for await (let chunk of this.sourceIter) {
      if (this.skip > 0) {
        if (chunk.length >= this.skip) {
          const [first, remainder] = LimitReader.splitChunk(chunk, this.skip);
          chunk = remainder;
          this.skip = 0;
        } else {
          this.skip -= chunk.length;
          continue;
        }
      }

      if (chunk.length > this.limit) {
        const [first, remainder] = LimitReader.splitChunk(chunk, this.limit);
        chunk = first;

        this.sourceIter._unread(remainder);
      }
      this.limit -= chunk.length;

      yield chunk;

      if (this.limit === 0) {
        break;
      }
    }
  }

  async readFully() {
    const chunks = [];
    let size = 0;

    //while (res = await this.read(), chunk = res.value) {
    for await (const chunk of this) {
      chunks.push(chunk);
      size += chunk.byteLength;
    }

    return LimitReader.concatChunks(chunks, size);
  }

  async skipFully() {
    let res;
    let chunk;

    const origLimit = this.limit;

    while (this.limit > 0) {
      this.limit -= await this.sourceIter.readSize(this.limit, true);
    }

    return origLimit;
  }
}


// ===========================================================================
export { BaseAsyncIterReader, AsyncIterReader, LimitReader };

