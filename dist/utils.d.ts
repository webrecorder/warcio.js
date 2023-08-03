import { R as Request } from './types-af1fe7fc.js';

declare function getSurt(url: string): string;
declare function postToGetUrl(request: Request): boolean;
declare function appendRequestQuery(url: string, query: string, method: string): string;
declare function jsonToQueryParams(json: string | any, ignoreInvalid?: boolean): URLSearchParams;
declare function mfdToQueryParams(mfd: string | Uint8Array, contentType: string): URLSearchParams;
declare function jsonToQueryString(json: any, ignoreInvalid?: boolean): string;
declare function mfdToQueryString(mfd: string | Uint8Array, contentType: string): string;
declare function concatChunks(chunks: Uint8Array[], size: number): Uint8Array;
declare function splitChunk(chunk: Uint8Array, inx: number): [Uint8Array, Uint8Array];

export { appendRequestQuery, concatChunks, getSurt, jsonToQueryParams, jsonToQueryString, mfdToQueryParams, mfdToQueryString, postToGetUrl, splitChunk };
