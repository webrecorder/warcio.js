// ReadableStreamReader
export type SourceReader = { read: Function };
// ReadableStream
export type SourceReadable = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export type IndexerOffsetLength = {
  offset: number;
  recordLength: number;
};

export type Request = {
  method: string;
  url: string;
  headers: Map<string, string> | Headers;
  postData?: Uint8Array | string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestBody?: any;
};
export type Response = Request;
