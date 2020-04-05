const Inflate = require('pako').Inflate;

// ===========================================================================
class NoConcatInflator extends Inflate
{
  onEnd(status) {
    this.err = status;
  } 
}

// ===========================================================================
class StreamReader {
  constructor(stream, compressed = true) {
    this.inflator = new NoConcatInflator();
    this.stream = stream;
    this.lastValue = null;

    this.done = false;

    this._savedChunk = null;

    this.compressed = compressed;

    this._rawOffset = 0;
    this._readOffset = 0;
  }

  async _loadNext()  {
    const res = await this.stream.read();
    this.done = res.done;
    return res.value;
  }

  _unread(chunk) {
    /* istanbul ignore if */
    if (!chunk) {
      return;
    }

    this._readOffset -= chunk.length;

    /* istanbul ignore if */
    if (this._savedChunk) {
      console.log('Already have chunk!');
    }

    this._savedChunk = chunk;
    this.done = false;
  }

  async read() {
    const value = await this._read();
    if (value) {
      this._readOffset += value.length;
    }
    return {value, done: !value};
  }

  async _read() {
    if (this.done) {
      return null;
    }

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

    while (this.compressed && !this.done) {
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
      this.inflator = new NoConcatInflator();
    }
    this.inflator.push(value);
  }

  _getNextChunk(original) {
    while (true) {
      if (this.inflator.chunks.length > 0) {
        return this.inflator.chunks.shift();
      }

      if (this.inflator.ended) {
        if (this.inflator.err !== 0)  {          
          // assume not compressed
          this.compressed = false;
          return original;
        }

        const avail_in = this.inflator.strm.avail_in;

        this._rawOffset += this.inflator.strm.total_in;

        if (avail_in && this.lastValue) {
          this._push(this.lastValue.slice(-avail_in));
          continue;
        }
      }

      return null;
    }
  }

  async* iterChunks() {
    let chunk = null;
    while (chunk = await this._read()) {
      yield chunk;
    }
  }

  async* iterLines() {
    let line = null;
    while (line = await this.readline()) {
      yield line;
    }
  }

  async readline() {
    if (this.done) {
      return "";
    }

    let inx = -1;
    const chunks = [];

    let size = 0;
    let chunk;

    while ((chunk = await this._read()) && ((inx = chunk.indexOf(10)) < 0)) {
      chunks.push(chunk);
      size += chunk.byteLength;
    }

    if (chunk) {
      const [first, remainder] = splitChunk(chunk, inx + 1);
      chunks.push(first);
      size += first.byteLength;
      chunk = remainder;
    }

    if (!chunk) {// || (!this.compressed && !chunk.length)) {
      this._savedChunk = null;
      this.done = true;
    } else if (!chunk.length) {
      this._savedChunk = null;
    } else {
      this._savedChunk = chunk;
    }

    if (!chunks.length) {
      return "";
    }

    const buff = concatChunks(chunks, size);

    this._readOffset += size;

    return new TextDecoder("utf-8").decode(buff);
  }

  readFully() {
    return this.readSize();
  }

  async readSize(sizeLimit = -1, incOffset = true) {
    const chunks = [];

    let size = 0;

    let chunk;

    while (chunk = await this._read()) {
      if (sizeLimit >= 0) {
        if (chunk.length > sizeLimit) {
          const [first, remainder] = splitChunk(chunk, sizeLimit);
          chunks.push(first);
          size += first.byteLength;
          if (remainder.length > 0) {
            this._savedChunk = remainder;
          }
          break;
        } else {
          sizeLimit -= chunk.length;
        }
      }
      chunks.push(chunk);
      size += chunk.byteLength;
    }

    if (incOffset) {
      this._readOffset += size;
    }

    return concatChunks(chunks, size);
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
}


// ===========================================================================
class LimitReader
{
  constructor(stream, limit = -1, skip = 0) {
    this.stream = stream;
    this.length = limit;
    this.limit = limit;
    this.skip = skip;
  }

  setLimitSkip(limit = -1, skip = 0) {
    this.limit = limit;
    this.skip = skip;
  }

  async read() {
    if (this.limit === 0) {
      return {done: true, value: null};
    }

    let res = await this.stream.read();
    let chunk = res ? res.value : null;

    while (this.skip > 0) {
      if (chunk.length >= this.skip) {
        const [first, remainder] = splitChunk(chunk, this.skip);
        chunk = remainder;
        this.skip = 0;
        break;
      } else {
        this.skip -= chunk.length;
        res = await this.stream.read();
        chunk = res.value;
      }
    }

    if (this.limit > 0 && chunk) {
      if (chunk.length > this.limit) {
        const [first, remainder] = splitChunk(chunk, this.limit);
        chunk = first;

        if (remainder.length > 0) {
          this.stream._unread(remainder);
        }
      }
      this.limit -= chunk.length;
    }

    return {done: !chunk, value: chunk}
  }

  async readFully() {
    const chunks = [];

    let size = 0;

    let res;
    let chunk;

    while (res = await this.read(), chunk = res.value) {
      chunks.push(chunk);
      size += chunk.byteLength;
    }

    return concatChunks(chunks, size);
  }
}


// ===========================================================================
function splitChunk(chunk, inx) {
  return [chunk.slice(0, inx), chunk.slice(inx)];
}


// ===========================================================================
function concatChunks(chunks, size) {
  const buffer = new Uint8Array(size);

  let offset = 0;

  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return buffer;
}


// ===========================================================================
exports.StreamReader = StreamReader;
exports.LimitReader = LimitReader;

exports.splitChunk = splitChunk;
exports.concatChunks = concatChunks;

