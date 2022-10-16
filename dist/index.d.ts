import { ReadStream } from 'fs';
import { Inflate, InflateOptions, ReturnCodes } from 'pako';
import * as stream_web from 'stream/web';
import { CompressionStream } from 'stream/web';
import yargs from 'yargs';

declare class NoConcatInflator extends Inflate {
    reader: AsyncIterReader;
    ended: boolean;
    chunks: Uint8Array[];
    constructor(options: InflateOptions, reader: AsyncIterReader);
    onEnd(status: ReturnCodes): void;
}
declare abstract class BaseAsyncIterReader {
    static readFully(iter?: AsyncGenerator<Uint8Array, void, unknown> | BaseAsyncIterReader): Promise<readonly [number, Uint8Array]>;
    abstract [Symbol.asyncIterator](): AsyncGenerator<Uint8Array, void, unknown>;
    getReadableStream(): ReadableStream<any>;
    readFully(): Promise<Uint8Array>;
    abstract readlineRaw(maxLength?: number): Promise<Uint8Array | null>;
    readline(maxLength?: number): Promise<string>;
    iterLines(maxLength?: number): AsyncGenerator<string, void, unknown>;
}
declare type AsyncIterReaderOpts = {
    raw: boolean;
};
declare class AsyncIterReader extends BaseAsyncIterReader {
    compressed: string | null;
    opts: AsyncIterReaderOpts;
    inflator: NoConcatInflator | null;
    _sourceIter: AsyncIterator<Uint8Array | null>;
    lastValue: Uint8Array | null;
    errored: boolean;
    _savedChunk: Uint8Array | null;
    _rawOffset: number;
    _readOffset: number;
    numChunks: number;
    constructor(streamOrIter: ReadStream | ReadableStream<Uint8Array> | AsyncGenerator<Uint8Array, void, unknown> | BaseAsyncIterReader | Uint8Array[] | Generator<Uint8Array, void, unknown>, compressed?: string, dechunk?: boolean);
    _loadNext(): Promise<Uint8Array | null>;
    dechunk(source: AsyncGenerator<Uint8Array, void, unknown>): AsyncIterator<Uint8Array | null>;
    unread(chunk: Uint8Array): void;
    _next(): Promise<Uint8Array | null>;
    _push(value: Uint8Array): void;
    _getNextChunk(original?: Uint8Array): Uint8Array | null | undefined;
    [Symbol.asyncIterator](): AsyncGenerator<Uint8Array, void, unknown>;
    readlineRaw(maxLength?: number): Promise<Uint8Array | null>;
    readFully(): Promise<Uint8Array>;
    readSize(sizeLimit?: number, skip?: boolean): Promise<readonly [number, Uint8Array]>;
    getReadOffset(): number;
    getRawOffset(): number;
    getRawLength(prevOffset: number): number;
    static fromReadable(source: ReadStream | ReadableStreamDefaultReader<Uint8Array>): {
        [Symbol.asyncIterator](): AsyncGenerator<Uint8Array, void, unknown>;
    };
    static fromIter(source: Generator<Uint8Array, void, unknown> | Uint8Array[]): {
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
declare const defaultRecordCT: {
    warcinfo: string;
    response: string;
    revisit: string;
    request: string;
    metadata: string;
};
declare type WARCRecordOpts = {
    url?: string;
    date?: string;
    type?: keyof typeof defaultRecordCT;
    warcHeaders?: any;
    filename?: string;
    httpHeaders?: Record<string, string>;
    statusline?: string;
    warcVersion?: typeof WARC_1_0 | typeof WARC_1_1;
    keepHeadersCase?: boolean;
    refersToUrl?: string;
    refersToDate?: string;
};
declare class WARCRecord<T extends AsyncGenerator<Uint8Array, void, unknown> | BaseAsyncIterReader = AsyncGenerator<Uint8Array, void, unknown>> extends BaseAsyncIterReader {
    static create({ url, date, type, warcHeaders, filename, httpHeaders, statusline, warcVersion, keepHeadersCase, refersToUrl, refersToDate, }: WARCRecordOpts | undefined, reader: AsyncGenerator<Uint8Array, void, unknown>): WARCRecord<AsyncGenerator<Uint8Array, void, unknown>>;
    static createWARCInfo(opts: WARCRecordOpts | undefined, info: Record<string, string>): WARCRecord<AsyncGenerator<Uint8Array, void, unknown>>;
    warcHeaders: StatusAndHeaders;
    _reader: T;
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
        reader: T;
    });
    getResponseInfo(): {
        headers: Map<string, string> | Headers;
        status: string | number;
        statusText: string;
    } | null;
    fixUp(): void;
    readFully(isContent?: boolean): Promise<Uint8Array>;
    get reader(): T;
    get contentReader(): BaseAsyncIterReader | T;
    _createDecodingReader(source: AsyncGenerator<Uint8Array, void, unknown> | BaseAsyncIterReader | Uint8Array[]): AsyncIterReader;
    readlineRaw(maxLength?: number): Promise<Uint8Array | null>;
    contentText(): Promise<string>;
    [Symbol.asyncIterator](): AsyncGenerator<Uint8Array, void, unknown>;
    skipFully(): Promise<number | undefined>;
    warcHeader(name: string): string | null | undefined;
    get warcType(): string | null | undefined;
    get warcTargetURI(): string;
    get warcDate(): string | null | undefined;
    get warcRefersToTargetURI(): string | null | undefined;
    get warcRefersToDate(): string | null | undefined;
    get warcPayloadDigest(): string | null | undefined;
    get warcBlockDigest(): string | null | undefined;
    get warcContentType(): string | null | undefined;
    get warcContentLength(): number;
}

declare type WarcParserOpts = {
    keepHeadersCase?: boolean;
    parseHttp?: boolean;
};
declare class WARCParser {
    static parse(source: ReadableStream<Uint8Array> | AsyncGenerator<Uint8Array, void, unknown>, options: WarcParserOpts): Promise<WARCRecord<LimitReader> | null>;
    static iterRecords(source: ReadableStream<Uint8Array> | AsyncGenerator<Uint8Array, void, unknown>, options: WarcParserOpts): AsyncGenerator<WARCRecord<LimitReader>, void, unknown>;
    _offset: number;
    _warcHeadersLength: number;
    _headersClass: typeof Map | typeof Headers;
    _parseHttp: boolean;
    _atRecordBoundary: boolean;
    _reader: AsyncIterReader;
    _record: WARCRecord<LimitReader> | null;
    constructor(source: ReadStream | ReadableStream<Uint8Array> | AsyncGenerator<Uint8Array, void, unknown>, { keepHeadersCase, parseHttp }?: WarcParserOpts);
    readToNextRecord(): Promise<string>;
    _initRecordReader(warcHeaders: StatusAndHeaders): LimitReader;
    parse(): Promise<WARCRecord<LimitReader> | null>;
    get offset(): number;
    get recordLength(): number;
    [Symbol.asyncIterator](): AsyncGenerator<WARCRecord<LimitReader>, void, unknown>;
    _addHttpHeaders(record: WARCRecord<LimitReader>, headersParser: StatusAndHeadersParser): Promise<void>;
}

declare type WARCSerializerOpts = {
    gzip?: boolean;
    digest?: {
        algo?: AlgorithmIdentifier;
        prefix?: string;
        base32?: string;
    };
};
declare class WARCSerializer extends BaseAsyncIterReader {
    static serialize(record: WARCRecord<LimitReader>, opts: WARCSerializerOpts): Promise<Uint8Array>;
    static base16(hashBuffer: ArrayBuffer): string;
    record: WARCRecord<LimitReader>;
    gzip: boolean;
    digestAlgo: AlgorithmIdentifier;
    digestAlgoPrefix: string;
    digestBase32: boolean;
    constructor(record: WARCRecord<LimitReader>, opts?: WARCSerializerOpts);
    [Symbol.asyncIterator](): AsyncGenerator<any, void, unknown>;
    readlineRaw(maxLength?: number): Promise<Uint8Array | null>;
    pakoCompress(): AsyncGenerator<any, void, unknown>;
    streamCompress(cs: CompressionStream): AsyncGenerator<string | stream_web.BufferSource, void, unknown>;
    digestMessage(chunk: BufferSource): Promise<string>;
    generateRecord(): AsyncGenerator<Uint8Array, void, unknown>;
}

declare const indexCommandArgs: yargs.Argv<{
    filename: string;
} & {
    f: string | undefined;
}>;
declare type IndexCommandArgs = Awaited<typeof indexCommandArgs.argv>;
declare const cdxIndexCommandArgs: yargs.Argv<{
    filename: string;
} & {
    a: boolean | undefined;
} & {
    format: string;
} & {
    noSurt: boolean | undefined;
}>;
declare type CdxIndexCommandArgs = Awaited<typeof cdxIndexCommandArgs.argv>;

declare type StreamResult = {
    filename: string;
    reader: ReadStream | ReadableStream<Uint8Array> | AsyncGenerator<Uint8Array, void, unknown>;
};
declare type StreamResults = StreamResult[];
declare type Request = {
    method: string;
    url: string;
    headers: Map<string, string> | Headers;
    postData?: any;
    requestBody?: any;
};

declare abstract class BaseIndexer {
    opts: IndexCommandArgs;
    out: NodeJS.WriteStream;
    fields: string[];
    parseHttp: boolean;
    constructor(opts: IndexCommandArgs, out: NodeJS.WriteStream);
    serialize(result: Record<string, any>): string;
    write(result: Record<string, any>): void;
    run(files: StreamResults): Promise<void>;
    iterIndex(files: StreamResults): AsyncGenerator<Record<string, any>, void, unknown>;
    iterRecords(parser: WARCParser, filename: string): AsyncGenerator<Record<string, any>, void, unknown>;
    filterRecord?(record: WARCRecord<LimitReader>): boolean;
    indexRecord(record: WARCRecord<LimitReader>, parser: WARCParser, filename: string): Record<string, any> | null;
    setField(field: string, record: WARCRecord<LimitReader>, result: Record<string, any>): void;
    getField(field: string, record: WARCRecord<LimitReader>): string | number | null | undefined;
}
declare class Indexer extends BaseIndexer {
    constructor(opts: IndexCommandArgs, out: NodeJS.WriteStream);
}
declare class CDXIndexer extends Indexer {
    includeAll: boolean;
    noSurt: boolean;
    _lastRecord: WARCRecord<LimitReader> | null;
    constructor(opts: CdxIndexCommandArgs, out: NodeJS.WriteStream);
    iterRecords(parser: WARCParser, filename: string): AsyncGenerator<Record<string, any>, void, unknown>;
    filterRecord(record: WARCRecord<LimitReader>): boolean;
    indexRecord(record: WARCRecord<LimitReader> | null, parser: WARCParser, filename: string): Record<string, any> | null;
    indexRecordPair(record: WARCRecord<LimitReader>, reqRecord: WARCRecord<LimitReader> | null, parser: WARCParser, filename: string): Record<string, any> | null;
    serializeCDXJ(result: Record<string, any>): string;
    serializeCDX11(result: Record<string, any>): string;
    getField(field: string, record: WARCRecord<LimitReader>): string | number | null | undefined;
}

declare function binaryToString(data: Uint8Array | string): string;
declare function rxEscape(string: string): string;
declare function getSurt(url: string): string;
declare function postToGetUrl(request: Request): boolean;
declare function appendRequestQuery(url: string, query: string, method: string): string;
declare function jsonToQueryParams(json: string | any, ignoreInvalid?: boolean): URLSearchParams;
declare function mfdToQueryParams(mfd: string | Uint8Array, contentType: string): URLSearchParams;
declare function jsonToQueryString(json: any, ignoreInvalid?: boolean): string;
declare function mfdToQueryString(mfd: string | Uint8Array, contentType: string): string;
declare function concatChunks(chunks: Uint8Array[], size: number): Uint8Array;
declare function splitChunk(chunk: Uint8Array, inx: number): [Uint8Array, Uint8Array];

export { AsyncIterReader, BaseAsyncIterReader, CDXIndexer, Indexer, LimitReader, StatusAndHeaders, StatusAndHeadersParser, StreamResults, WARCParser, WARCRecord, WARCSerializer, appendRequestQuery, binaryToString, concatChunks, getSurt, jsonToQueryParams, jsonToQueryString, mfdToQueryParams, mfdToQueryString, postToGetUrl, rxEscape, splitChunk };
