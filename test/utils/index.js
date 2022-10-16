/*eslint-env node */

import crypto from "node:crypto";

global.crypto = crypto;

const encoder = new TextEncoder("utf-8");


// ===========================================================================
// StreamReader utils
function getReader(items) {
  return getReadableStream(items).getReader();
}

function getReadableStream(items) {
  return new ReadableStream({
    start(controller) {
      for (const item of items) {
        const buff = typeof(item) === "string" ? encoder.encode(item) : item;
        controller.enqueue(buff);
      }

      controller.close();
    }
  });
}

export { getReader, getReadableStream };

