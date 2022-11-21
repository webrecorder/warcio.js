// adapted from https://github.com/celeranis/node-current-types/blob/master/webstreams.d.ts

import * as WebStreams from "node:stream/web";

/* eslint-disable no-var, @typescript-eslint/no-empty-interface, @typescript-eslint/no-explicit-any */
declare module "stream/web" {
  interface CompressionStream
    extends ReadableWritablePair<string | BufferSource, Uint8Array> {}
  var CompressionStream: {
    new (format: "deflate" | "gzip"): CompressionStream;
    prototype: CompressionStream;
  };

  interface ReadableStreamDefaultReader<R>
    extends WebStreams.ReadableStreamDefaultReader<R> {
    read(): Promise<ReadableStreamReadResult<R>>;
  }

  interface ReadableStream<R = any> extends WebStreams.ReadableStream<R> {
    getReader(): ReadableStreamDefaultReader<R>;
    pipeThrough<T>(
      transform: ReadableWritablePair<T, R>,
      options?: StreamPipeOptions
    ): ReadableStream<T>;
  }
}

declare global {
  var CompressionStream: typeof WebStreams.CompressionStream;
  interface CompressionStream extends WebStreams.CompressionStream {}
}

/* eslint-enable no-var, @typescript-eslint/no-empty-interface, @typescript-eslint/no-explicit-any */

export {};
