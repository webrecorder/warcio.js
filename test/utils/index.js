import { Headers } from 'node-fetch';

import { ReadableStream } from "web-streams-node";

import { Crypto } from '@peculiar/webcrypto'

global.Headers = Headers;
global.crypto = new Crypto();

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

