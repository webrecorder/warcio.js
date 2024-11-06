import { R as Request } from './types-bcbdd303.js';

declare function getSurt(url: string): string;
declare function postToGetUrl(request: Request): boolean;
declare function appendRequestQuery(url: string, query: string, method: string): string;
declare function jsonToQueryParams(json: unknown, ignoreInvalid?: boolean): URLSearchParams;
declare function mfdToQueryParams(mfd: string | Uint8Array | null | undefined, contentType: string): URLSearchParams;
declare function jsonToQueryString(json?: string | Record<string, unknown> | undefined | null, ignoreInvalid?: boolean): string;
declare function mfdToQueryString(mfd: string | Uint8Array | undefined | null, contentType: string): string;
declare function concatChunks(chunks: Uint8Array[], size: number): Uint8Array;
declare function splitChunk(chunk: Uint8Array, inx: number): [Uint8Array, Uint8Array];

export { appendRequestQuery as a, jsonToQueryString as b, mfdToQueryString as c, concatChunks as d, getSurt as g, jsonToQueryParams as j, mfdToQueryParams as m, postToGetUrl as p, splitChunk as s };
