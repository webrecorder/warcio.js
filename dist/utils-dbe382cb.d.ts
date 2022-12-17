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
type Request = {
    method: string;
    url: string;
    headers: Map<string, string> | Headers;
    postData?: any;
    requestBody?: any;
};

declare function getSurt(url: string): string;
declare function postToGetUrl(request: Request): boolean;
declare function appendRequestQuery(url: string, query: string, method: string): string;
declare function jsonToQueryParams(json: string | any, ignoreInvalid?: boolean): URLSearchParams;
declare function mfdToQueryParams(mfd: string | Uint8Array, contentType: string): URLSearchParams;
declare function jsonToQueryString(json: any, ignoreInvalid?: boolean): string;
declare function mfdToQueryString(mfd: string | Uint8Array, contentType: string): string;
declare function concatChunks(chunks: Uint8Array[], size: number): Uint8Array;
declare function splitChunk(chunk: Uint8Array, inx: number): [Uint8Array, Uint8Array];

export { Request as R, Source as S, SourceReader as a, StreamResults as b, appendRequestQuery as c, jsonToQueryString as d, mfdToQueryString as e, concatChunks as f, getSurt as g, SourceReadable as h, StreamResult as i, jsonToQueryParams as j, mfdToQueryParams as m, postToGetUrl as p, splitChunk as s };
