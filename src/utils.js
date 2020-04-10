const StreamReader = require('./readers').StreamReader;


// ===========================================================================
function toStreamReader(streamOrReader) {
  // already StreamReader, use as is
  if (streamOrReader instanceof StreamReader) {
    return streamOrReader;
  }

  let obj = null;

  // web stream
  if (typeof(streamOrReader.getReader) === "function") {
    obj = streamOrReader.getReader();
  } else if (typeof(streamOrReader[Symbol.asyncIterator]) === "function") {
  // node stream with async iter support
    obj = new WrapNodeStream(streamOrReader);
  } else if (typeof(streamOrReader.read) === "function") {
  // assume object itself is a Readable
    obj = streamOrReader;
  }

  return new StreamReader(obj);
}


// ===========================================================================
class WrapNodeStream
{
  constructor(stream) {
    this.iter = stream[Symbol.asyncIterator]();
  }

  async read() {
    return await this.iter.next();
  }
}


// ===========================================================================
exports.WrapNodeStream = WrapNodeStream;
exports.toStreamReader = toStreamReader;
