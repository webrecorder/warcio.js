import { WriteStream } from 'node:fs';
import { f as WARCSerializerOpts$1, b as WARCSerializer$1, W as WARCRecord, j as SerializerInMemBuffer } from '../warcserializer-2efa2b4e.js';
import 'hash-wasm/dist/lib/WASMInterface';
import 'pako';
import '../types-af1fe7fc.js';

declare const DEFAULT_MEM_SIZE: number;
type WARCSerializerOpts = WARCSerializerOpts$1 & {
    maxMemSize?: number;
};
declare class WARCSerializer extends WARCSerializer$1 {
    static serialize(record: WARCRecord, opts?: WARCSerializerOpts): Promise<Uint8Array>;
    constructor(record: WARCRecord, opts?: WARCSerializerOpts);
}
declare class TempFileBuffer extends SerializerInMemBuffer {
    memSize: number;
    currSize: number;
    fh: WriteStream | null;
    filename: string;
    constructor(memSize?: number);
    write(chunk: Uint8Array): void;
    readAll(): AsyncIterable<Uint8Array>;
}

export { DEFAULT_MEM_SIZE, TempFileBuffer, WARCSerializer, WARCSerializerOpts };
