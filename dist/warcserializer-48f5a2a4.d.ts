import { IHasher } from 'hash-wasm/dist/lib/WASMInterface';
import pako from 'pako';
import { S as Source, b as SourceReader } from './types-af1fe7fc.js';

declare class NoConcatInflator<T extends BaseAsyncIterReader> extends pako.Inflate {
    reader: T;
    ended: boolean;
    chunks: Uint8Array[];
    constructor(options: pako.InflateOptions, reader: T);
    onEnd(status: pako.ReturnCodes): void;
}
declare abstract class BaseAsyncIterReader {
    static readFully(iter: AsyncIterable<Uint8Array> | Iterable<Uint8Array>): Promise<Uint8Array>;
    abstract [Symbol.asyncIterator](): AsyncIterator<Uint8Array>;
    getReadableStream(): ReadableStream<any>;
    readFully(): Promise<Uint8Array>;
    abstract readlineRaw(maxLength?: number): Promise<Uint8Array | null>;
    readline(maxLength?: number): Promise<string>;
    iterLines(maxLength?: number): AsyncGenerator<string, void, unknown>;
}
type AsyncIterReaderOpts = {
    raw: boolean;
};
declare class AsyncIterReader extends BaseAsyncIterReader {
    compressed: string | null;
    opts: AsyncIterReaderOpts;
    inflator: NoConcatInflator<this> | null;
    _sourceIter: AsyncIterator<Uint8Array | null>;
    lastValue: Uint8Array | null;
    errored: boolean;
    _savedChunk: Uint8Array | null;
    _rawOffset: number;
    _readOffset: number;
    numChunks: number;
    constructor(streamOrIter: Source, compressed?: string | null, dechunk?: boolean);
    _loadNext(): Promise<Uint8Array | null>;
    dechunk(source: AsyncIterable<Uint8Array>): AsyncIterator<Uint8Array | null>;
    unread(chunk: Uint8Array): void;
    _next(): Promise<Uint8Array | null>;
    _push(value: Uint8Array): void;
    _getNextChunk(original?: Uint8Array): Uint8Array | null | undefined;
    [Symbol.asyncIterator](): AsyncGenerator<Uint8Array, void, unknown>;
    readlineRaw(maxLength?: number): Promise<Uint8Array | null>;
    readFully(): Promise<Uint8Array>;
    readSize(sizeLimit: number): Promise<Uint8Array>;
    skipSize(sizeLimit: number): Promise<number>;
    _readOrSkip(sizeLimit?: number, skip?: boolean): Promise<readonly [number, Uint8Array]>;
    getReadOffset(): number;
    getRawOffset(): number;
    getRawLength(prevOffset: number): number;
    static fromReadable<Readable extends SourceReader>(source: Readable): {
        [Symbol.asyncIterator](): AsyncGenerator<Uint8Array, void, unknown>;
    };
    static fromIter(source: Iterable<Uint8Array>): {
        [Symbol.asyncIterator](): AsyncGenerator<Uint8Array, void, unknown>;
    };
}
declare class LimitReader extends BaseAsyncIterReader {
    sourceIter: AsyncIterReader;
    length: number;
    limit: number;
    skip: number;
    constructor(streamIter: AsyncIterReader, limit: number, skip?: number);
    setLimitSkip(limit: number, skip?: number): void;
    [Symbol.asyncIterator](): AsyncGenerator<Uint8Array, void, unknown>;
    readlineRaw(maxLength?: number): Promise<Uint8Array | null>;
    skipFully(): Promise<number>;
}

declare class StatusAndHeaders {
    statusline: string;
    headers: Map<string, string> | Headers;
    constructor({ statusline, headers, }: {
        statusline: string;
        headers: Map<string, string> | Headers;
    });
    toString(): string;
    iterSerialize(encoder: TextEncoder): AsyncGenerator<Uint8Array, void, unknown>;
    _protocol: string;
    _statusCode: number | string;
    _statusText: string;
    _parseResponseStatusLine(): void;
    get statusCode(): string | number;
    get protocol(): string;
    get statusText(): string;
    _method: string;
    _requestPath: string;
    _parseRequestStatusLine(): void;
    get method(): string;
    get requestPath(): string;
}
declare class StatusAndHeadersParser {
    parse(reader: AsyncIterReader, { headersClass, firstLine, }?: {
        firstLine?: string;
        headersClass: typeof Map | typeof Headers;
    }): Promise<StatusAndHeaders | null>;
}

declare const WARC_1_1 = "WARC/1.1";
declare const WARC_1_0 = "WARC/1.0";
type WARCType = "warcinfo" | "response" | "resource" | "request" | "metadata" | "revisit" | "conversion" | "continuation";
type WARCRecordOpts = {
    url?: string;
    date?: string;
    type?: WARCType;
    warcHeaders?: Record<string, string>;
    filename?: string;
    httpHeaders?: HeadersInit;
    statusline?: string;
    warcVersion?: typeof WARC_1_0 | typeof WARC_1_1;
    keepHeadersCase?: boolean;
    refersToUrl?: string;
    refersToDate?: string;
};
declare class WARCRecord extends BaseAsyncIterReader {
    static create({ url, date, type, warcHeaders, filename, httpHeaders, statusline, warcVersion, keepHeadersCase, refersToUrl, refersToDate, }?: WARCRecordOpts, reader?: AsyncIterable<Uint8Array> | Iterable<Uint8Array>): WARCRecord;
    static createWARCInfo(opts: WARCRecordOpts | undefined, info: Record<string, string>): WARCRecord;
    warcHeaders: StatusAndHeaders;
    _reader: AsyncIterable<Uint8Array> | Iterable<Uint8Array>;
    _contentReader: BaseAsyncIterReader | null;
    payload: Uint8Array | null;
    httpHeaders: StatusAndHeaders | null;
    consumed: "content" | "raw" | "skipped" | "";
    _offset: number;
    _length: number;
    method: string;
    requestBody: string;
    _urlkey: string;
    constructor({ warcHeaders, reader, }: {
        warcHeaders: StatusAndHeaders;
        reader: AsyncIterable<Uint8Array> | Iterable<Uint8Array>;
    });
    getResponseInfo(): {
        headers: Map<string, string> | Headers;
        status: string | number;
        statusText: string;
    } | null;
    fixUp(): void;
    readFully(isContent?: boolean): Promise<Uint8Array>;
    get reader(): AsyncIterable<Uint8Array> | Iterable<Uint8Array>;
    get contentReader(): AsyncIterable<Uint8Array> | Iterable<Uint8Array>;
    _createDecodingReader(source: Source): AsyncIterReader;
    readlineRaw(maxLength?: number): Promise<Uint8Array | null>;
    contentText(): Promise<string>;
    [Symbol.asyncIterator](): AsyncGenerator<Uint8Array, void, unknown>;
    skipFully(): Promise<number | undefined>;
    warcHeader(name: string): string | null | undefined;
    get warcType(): string | null | undefined;
    get warcTargetURI(): string | null | undefined;
    get warcDate(): string | null | undefined;
    get warcRefersToTargetURI(): string | null | undefined;
    get warcRefersToDate(): string | null | undefined;
    get warcPayloadDigest(): string | null | undefined;
    get warcBlockDigest(): string | null | undefined;
    get warcContentType(): string | null | undefined;
    get warcContentLength(): number;
}

type WARCSerializerOpts = {
    gzip?: boolean;
    digest?: {
        algo?: AlgorithmIdentifier;
        prefix?: string;
        base32?: boolean;
    };
    preferPako?: boolean;
};
declare abstract class BaseSerializerBuffer {
    abstract write(chunk: Uint8Array): void;
    abstract readAll(): AsyncIterable<Uint8Array>;
}
declare class SerializerInMemBuffer extends BaseSerializerBuffer {
    buffers: Array<Uint8Array>;
    write(chunk: Uint8Array): void;
    readAll(): AsyncIterable<Uint8Array>;
}
declare class WARCSerializer extends BaseAsyncIterReader {
    gzip: boolean;
    digestAlgo: AlgorithmIdentifier;
    digestAlgoPrefix: string;
    digestBase32: boolean;
    preferPako: boolean;
    record: WARCRecord;
    externalBuffer: BaseSerializerBuffer;
    _alreadyDigested: boolean;
    blockHasher: IHasher | null;
    payloadHasher: IHasher | null;
    httpHeadersBuff: Uint8Array | null;
    warcHeadersBuff: Uint8Array | null;
    static serialize(record: WARCRecord, opts?: WARCSerializerOpts, externalBuffer?: BaseSerializerBuffer): Promise<Uint8Array>;
    constructor(record: WARCRecord, opts?: WARCSerializerOpts, externalBuffer?: BaseSerializerBuffer);
    static noComputeDigest(record: WARCRecord): string | true | null | undefined;
    [Symbol.asyncIterator](): AsyncGenerator<any, void, unknown>;
    readlineRaw(maxLength?: number): Promise<Uint8Array | null>;
    pakoCompress(): AsyncGenerator<any, void, unknown>;
    streamCompress(cs: CompressionStream): AsyncGenerator<Uint8Array, void, unknown>;
    newHasher(): Promise<IHasher> | null;
    getDigest(hasher: IHasher): string;
    digestRecord(): Promise<number>;
    generateRecord(): AsyncGenerator<Uint8Array, void, unknown>;
}

export { AsyncIterReader as A, BaseAsyncIterReader as B, LimitReader as L, NoConcatInflator as N, StatusAndHeaders as S, WARCRecord as W, StatusAndHeadersParser as a, WARCSerializer as b, BaseSerializerBuffer as c, WARC_1_0 as d, WARC_1_1 as e, WARCSerializerOpts as f, WARCRecordOpts as g, WARCType as h, AsyncIterReaderOpts as i, SerializerInMemBuffer as j };
