// adapted from https://github.com/celeranis/node-current-types/blob/master/webstreams.d.ts

import * as WebStreams from "node:stream/web";

/* eslint-disable no-var, @typescript-eslint/no-empty-interface */
declare module "stream/web" {
  // https://wicg.github.io/compression/
  // https://developer.mozilla.org/en-US/docs/Web/API/CompressionStream/CompressionStream
  // https://chromium.googlesource.com/devtools/devtools-frontend/+/581bfa00fd962837c51e2284dc78303446088c67/test/unittests/front_end/models/bindings/FileUtils_test.ts
  export interface CompressionStream extends GenericTransformStream {
    readonly format: "gzip" | "deflate" | "deflate-raw";
  }
  declare const CompressionStream: {
    prototype: CompressionStream;
    new (format: "gzip" | "deflate" | "deflate-raw"): CompressionStream;
  };
}

declare global {
  export var CompressionStream: typeof WebStreams.CompressionStream;
  interface CompressionStream extends WebStreams.CompressionStream {}
}

/* eslint-enable no-var, @typescript-eslint/no-empty-interface, @typescript-eslint/no-explicit-any */

export {};
