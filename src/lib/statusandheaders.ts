import {
  concatChunks,
  HeadersMultiMap,
  latin1ToUTF,
  splitChunk,
  UTFToLatin1,
} from "./utils";
import { type AsyncIterReader } from "./readers";

export const CRLF = new Uint8Array([13, 10]);
export const CRLFCRLF = new Uint8Array([13, 10, 13, 10]);

const decoder = new TextDecoder("utf-8");

// ===========================================================================
export class StatusAndHeaders {
  statusline: string;
  headers: HeadersMultiMap | Headers;
  readonly reencodeHeaders?: Set<string>;

  constructor({
    statusline,
    headers,
    reencodeHeaders,
  }: {
    statusline: string;
    headers: HeadersMultiMap | Headers;
    reencodeHeaders?: Set<string>;
  }) {
    this.statusline = statusline;
    this.headers = headers;
    this.reencodeHeaders = reencodeHeaders;
  }

  toString() {
    const buff = [this.statusline];

    const isHeaders = this.headers instanceof Headers;

    for (const [name, value] of this.headers) {
      if (isHeaders && this.reencodeHeaders?.has(name)) {
        buff.push(`${name}: ${latin1ToUTF(value)}`);
      } else {
        buff.push(`${name}: ${value}`);
      }
    }

    return buff.join("\r\n") + "\r\n";
  }

  async *iterSerialize(encoder: TextEncoder) {
    yield encoder.encode(this.statusline);
    yield CRLF;
    for (const [name, value] of this.headers) {
      yield encoder.encode(`${name}: ${value}\r\n`);
    }
  }

  _protocol: string | undefined;
  _statusCode: number | string | undefined;
  _statusText: string | undefined;

  _parseResponseStatusLine() {
    const parts = splitRemainder(this.statusline, " ", 2);
    this._protocol = parts[0] ?? "";
    this._statusCode = parts.length > 1 ? Number(parts[1]) : "";
    this._statusText = parts.length > 2 ? parts[2] : "";
  }

  get statusCode() {
    if (this._statusCode === undefined) {
      this._parseResponseStatusLine();
    }
    return this._statusCode;
  }

  get protocol() {
    if (this._protocol === undefined) {
      this._parseResponseStatusLine();
    }
    return this._protocol;
  }

  get statusText() {
    if (this._statusText === undefined) {
      this._parseResponseStatusLine();
    }
    return this._statusText;
  }

  _method: string | undefined;
  _requestPath: string | undefined;

  _parseRequestStatusLine() {
    const parts = this.statusline.split(" ", 2);
    this._method = parts[0] ?? "";
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length checked
    this._requestPath = parts.length > 1 ? parts[1]! : "";
  }

  get method() {
    if (this._method === undefined) {
      this._parseRequestStatusLine();
    }
    return this._method;
  }

  get requestPath() {
    if (this._requestPath === undefined) {
      this._parseRequestStatusLine();
    }
    return this._requestPath;
  }
}

// ===========================================================================
export class StatusAndHeadersParser {
  reencodeHeaders = new Set<string>();

  async parse(
    reader: AsyncIterReader,
    {
      headersClass,
      firstLine,
    }: {
      firstLine?: string;
      headersClass: typeof HeadersMultiMap | typeof Headers;
    } = {
      headersClass: HeadersMultiMap,
    },
  ) {
    const fullStatusLine = firstLine ? firstLine : await reader.readline();

    if (!fullStatusLine) {
      return null;
    }

    const statusline = fullStatusLine.trimEnd();

    if (!statusline) {
      return null;
    }

    const headers = new headersClass();

    const headerBuff = await readToDoubleCRLF(reader);

    let start = 0;
    let nameEnd, valueStart, valueEnd;
    let name = "";
    let value;

    while (start < headerBuff.length) {
      valueEnd = headerBuff.indexOf("\n", start);

      if (value && (headerBuff[start] === " " || headerBuff[start] === "\t")) {
        value += headerBuff
          .slice(start, valueEnd < 0 ? undefined : valueEnd)
          .trimEnd();
      } else {
        if (value) {
          this.setHeader(name, value, headers);
          value = null;
        }

        nameEnd = headerBuff.indexOf(":", start);

        valueStart = nameEnd < 0 ? start : nameEnd + 1;

        if (nameEnd >= 0 && nameEnd < valueEnd) {
          name = headerBuff.slice(start, nameEnd).trimStart();
          value = headerBuff
            .slice(valueStart, valueEnd < 0 ? undefined : valueEnd)
            .trim();
        } else {
          value = null;
        }
      }

      if (valueEnd < 0) {
        break;
      }

      start = valueEnd + 1;
    }

    if (value) {
      this.setHeader(name, value, headers);
    }

    return new StatusAndHeaders({
      statusline,
      headers,
      reencodeHeaders: this.reencodeHeaders,
    });
  }

  setHeader(
    name: string,
    value: string,
    headers: Headers | HeadersMultiMap,
    reencoded = false,
  ) {
    try {
      headers.append(name, value);
      if (headers instanceof Headers && reencoded) {
        this.reencodeHeaders.add(name.toLowerCase());
      }
    } catch (_e) {
      if (!reencoded) {
        // if haven't reencoded already, try reencoding as latin1 before saving
        this.setHeader(name, UTFToLatin1(value), headers, true);
      }
    }
  }
}

// ===========================================================================
function splitRemainder(str: string, sep: string, limit: number) {
  const parts = str.split(sep);
  const newParts = parts.slice(0, limit);
  const rest = parts.slice(limit);
  if (rest.length > 0) {
    newParts.push(parts.slice(limit).join(sep));
  }
  return newParts;
}

// ===========================================================================
export async function indexOfDoubleCRLF(
  buffer: Uint8Array,
  iter: AsyncIterator<Uint8Array, void, unknown>,
) {
  let start = 0;

  for (let i = 0; i < buffer.length - 4; i++) {
    const inx = buffer.indexOf(13, start);
    if (inx < 0) {
      break;
    }

    if (inx + 3 >= buffer.length) {
      const { value } = await iter.next();
      if (!value) {
        break;
      }

      const newBuff = new Uint8Array(value.length + buffer.length);
      newBuff.set(buffer, 0);
      newBuff.set(value, buffer.length);
      buffer = newBuff;
    }

    if (
      buffer[inx + 1] === 10 &&
      buffer[inx + 2] === 13 &&
      buffer[inx + 3] === 10
    ) {
      return [inx + 3, buffer] as const;
    }

    start = inx + 1;
  }

  return [-1, buffer] as const;
}

// ===========================================================================
export async function readToDoubleCRLF(reader: AsyncIterReader) {
  const chunks = [];
  let size = 0;

  let inx = 0;

  let lastChunk = null;

  const iter = reader[Symbol.asyncIterator]();

  for await (let chunk of iter) {
    [inx, chunk] = await indexOfDoubleCRLF(chunk, iter);

    if (inx >= 0) {
      lastChunk = chunk;
      break;
    }

    chunks.push(chunk);
    size += chunk.byteLength;
  }

  if (lastChunk) {
    const [first, remainder] = splitChunk(lastChunk, inx + 1);
    chunks.push(first);
    size += first.byteLength;

    reader.unread(remainder);
  } else if (!chunks.length) {
    return "";
  }

  return decoder.decode(concatChunks(chunks, size));
}

// ===========================================================================
