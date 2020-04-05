import { Headers } from 'node-fetch';

import { ReadableStream } from "web-streams-node";


global.Headers = Headers;

const encoder = new TextEncoder("utf-8");


// ===========================================================================
// StreamReader utils
function getReader(items) {

  const rs = new ReadableStream({
    start(controller) {
      for (const item of items) {
        const buff = typeof(item) === "string" ? encoder.encode(item) : item;
        controller.enqueue(buff);
      }

      controller.close();
    }
  });

  return rs.getReader();
}

export { getReader };

