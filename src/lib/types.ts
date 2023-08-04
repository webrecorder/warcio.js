// ReadableStreamReader
// eslint-disable-next-line @typescript-eslint/ban-types
export type SourceReader = { read: Function };
// ReadableStream
export type SourceReadable = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  getReader: (...args: any) => { read: Function };
};

export type Source =
  | SourceReader
  | SourceReadable
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postData?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestBody?: any;
};
export type Response = Request;
