import { ReadableStream } from "node:stream/web";

const encoder = new TextEncoder();

// ===========================================================================
// StreamReader utils
export function getReader(items: (Uint8Array | string)[]) {
  return getReadableStream(items).getReader();
}

export function getReadableStream(items: (Uint8Array | string)[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const item of items) {
        const buff = typeof item === "string" ? encoder.encode(item) : item;
        controller.enqueue(buff);
      }

      controller.close();
    },
  });
}
