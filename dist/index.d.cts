import { W as WARCRecord, A as AsyncIterReader, S as StatusAndHeaders, L as LimitReader, a as StatusAndHeadersParser } from './warcserializer-0b661154.js';
export { A as AsyncIterReader, i as AsyncIterReaderOpts, B as BaseAsyncIterReader, c as BaseSerializerBuffer, L as LimitReader, N as NoConcatInflator, S as StatusAndHeaders, a as StatusAndHeadersParser, W as WARCRecord, g as WARCRecordOpts, b as WARCSerializer, f as WARCSerializerOpts, h as WARCType, d as WARC_1_0, e as WARC_1_1 } from './warcserializer-0b661154.js';
import { I as IndexerOffsetLength, S as Source, a as StreamResults } from './types-bcbdd303.js';
export { I as IndexerOffsetLength, R as Request, S as Source, c as SourceReadable, b as SourceReader, d as StreamResult, a as StreamResults } from './types-bcbdd303.js';
import { WritableStreamBuffer } from 'stream-buffers';
export { a as appendRequestQuery, d as concatChunks, g as getSurt, j as jsonToQueryParams, b as jsonToQueryString, m as mfdToQueryParams, c as mfdToQueryString, p as postToGetUrl, s as splitChunk } from './utils-17b80bf1.js';
import 'hash-wasm/dist/lib/WASMInterface.js';
import 'pako';

type WARCParserOpts = {
    keepHeadersCase?: boolean;
    parseHttp?: boolean;
};
declare class WARCParser implements IndexerOffsetLength {
    static parse(source: Source, options?: WARCParserOpts): Promise<WARCRecord | null>;
    static iterRecords(source: Source, options?: WARCParserOpts): AsyncGenerator<WARCRecord, void, unknown>;
    _offset: number;
    _warcHeadersLength: number;
    _headersClass: typeof Map | typeof Headers;
    _parseHttp: boolean;
    _reader: AsyncIterReader;
    _record: WARCRecord | null;
    constructor(source: Source, { keepHeadersCase, parseHttp }?: WARCParserOpts);
    readToNextRecord(): Promise<Uint8Array | null>;
    _initRecordReader(warcHeaders: StatusAndHeaders): LimitReader;
    parse(): Promise<WARCRecord | null>;
    get offset(): number;
    get recordLength(): number;
    [Symbol.asyncIterator](): AsyncGenerator<WARCRecord, void, unknown>;
    _addHttpHeaders(record: WARCRecord, headersParser: StatusAndHeadersParser): Promise<void>;
}

type IndexCommandArgs = any;
type CdxIndexCommandArgs = any;

declare const DEFAULT_FIELDS: string[];
declare abstract class BaseIndexer {
    opts: Partial<IndexCommandArgs>;
    fields: string[];
    reqFields: string[];
    parseHttp: boolean;
    constructor(opts?: Partial<IndexCommandArgs>, defaultFields?: string[]);
    serialize(result: Record<string, any>): string;
    write(result: Record<string, any>, out: WritableStreamBuffer | NodeJS.WriteStream): void;
    writeAll(files: StreamResults, out: WritableStreamBuffer | NodeJS.WriteStream): Promise<void>;
    iterIndex(files: StreamResults): AsyncGenerator<Record<string, any>, void, unknown>;
    iterRecords(parser: WARCParser, filename: string): AsyncGenerator<Record<string, any>, void, unknown>;
    filterRecord?(record: WARCRecord): boolean;
    indexRecord(record: WARCRecord, indexerOffset: IndexerOffsetLength, filename: string): Record<string, any> | null;
    setField(field: string, record: WARCRecord, result: Record<string, any>): void;
    getField(field: string, record: WARCRecord): string | number | null | undefined;
}
declare class Indexer extends BaseIndexer {
    constructor(opts?: Partial<IndexCommandArgs>, defaultFields?: string[]);
}
declare const DEFAULT_CDX_FIELDS: string[];
declare const DEFAULT_LEGACY_CDX_FIELDS: string[];
interface CDXAndRecord {
    cdx: Record<string, any>;
    record: WARCRecord;
    reqRecord: WARCRecord | null;
}
declare class CDXIndexer extends Indexer {
    includeAll: boolean;
    overrideIndexForAll: boolean;
    noSurt: boolean;
    _lastRecord: WARCRecord | null;
    constructor(opts?: Partial<CdxIndexCommandArgs>);
    iterRecords(parser: WARCParser, filename: string): AsyncGenerator<Record<string, any>, void, unknown>;
    filterRecord(record: WARCRecord): boolean;
    indexRecord(record: WARCRecord | null, indexOffset: IndexerOffsetLength, filename: string): Record<string, any> | null;
    indexRecordPair(record: WARCRecord, reqRecord: WARCRecord | null, indexOffset: IndexerOffsetLength, filename: string): Record<string, any> | null;
    serializeCDXJ(result: Record<string, any>): string;
    serializeCDX11(result: Record<string, any>): string;
    getField(field: string, record: WARCRecord): string | number | null | undefined;
}
declare class CDXAndRecordIndexer extends CDXIndexer {
    constructor(opts?: Partial<CdxIndexCommandArgs>);
    indexRecordPair(record: WARCRecord, reqRecord: WARCRecord | null, indexOffset: IndexerOffsetLength, filename: string): CDXAndRecord | null;
}

export { CDXAndRecordIndexer, CDXIndexer, DEFAULT_CDX_FIELDS, DEFAULT_FIELDS, DEFAULT_LEGACY_CDX_FIELDS, Indexer, WARCParser, WARCParserOpts };
