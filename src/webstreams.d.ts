// adapted from https://github.com/celeranis/node-current-types/blob/master/webstreams.d.ts

import type * as WebStreams from "node:stream/web";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface CompressionStream extends WebStreams.CompressionStream {}
}
