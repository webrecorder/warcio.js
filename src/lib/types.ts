import { ReadStream } from "fs";

export type StreamResult = {
  filename: string;
  reader:
    | ReadStream
    | ReadableStream<Uint8Array>
    | AsyncGenerator<Uint8Array, void, unknown>;
};
export type StreamResults = StreamResult[];

export type Request = {
  method: string;
  url: string;
  headers: Map<string, string> | Headers;
  postData?: any;
  requestBody?: any;
};
export type Response = Request;
