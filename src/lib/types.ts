export type Source =
  | { read: Function }
  | AsyncIterable<Uint8Array>
  | Iterable<Uint8Array>;

export type StreamResult = {
  filename: string;
  reader: AsyncIterable<Uint8Array>;
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
