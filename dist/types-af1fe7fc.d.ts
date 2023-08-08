type SourceReader = {
    read: Function;
};
type SourceReadable = {
    getReader: (...args: any) => {
        read: Function;
    };
};
type Source = SourceReader | SourceReadable | AsyncIterable<Uint8Array> | Iterable<Uint8Array>;
type StreamResult = {
    filename: string;
    reader: AsyncIterable<Uint8Array>;
};
type StreamResults = StreamResult[];
type IndexerOffsetLength = {
    offset: number;
    recordLength: number;
};
type Request = {
    method: string;
    url: string;
    headers: Map<string, string> | Headers;
    postData?: any;
    requestBody?: any;
};

export { IndexerOffsetLength as I, Request as R, Source as S, StreamResults as a, SourceReader as b, SourceReadable as c, StreamResult as d };
