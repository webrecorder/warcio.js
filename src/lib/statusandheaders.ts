import { concatChunks, splitChunk } from "./utils";
import { AsyncIterReader } from "./readers";

export const CRLF = new Uint8Array([13, 10]);
export const CRLFCRLF = new Uint8Array([13, 10, 13, 10]);

const decoder = new TextDecoder("utf-8");

// ===========================================================================
export class StatusAndHeaders {
  statusline: string;
  headers: Map<string, string> | Headers;

  constructor({
    statusline,
    headers,
  }: {
    statusline: string;
    headers: Map<string, string> | Headers;
  }) {
    this.statusline = statusline;
    this.headers = headers;
  }

  toString() {
    const buff = [this.statusline];

    for (const [name, value] of this.headers) {
      buff.push(`${name}: ${value}`);
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

  _protocol!: string;
  _statusCode!: number | string;
  _statusText!: string;

  _parseResponseStatusLine() {
    const parts = splitRemainder(this.statusline, " ", 2);
    this._protocol = parts[0] ?? "";
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length checked
    this._statusCode = parts.length > 1 ? Number(parts[1]) : "";
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length checked
    this._statusText = parts.length > 2 ? parts[2]! : "";
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

  _method!: string;
  _requestPath!: string;

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
  async parse(
    reader: AsyncIterReader,
    {
      headersClass,
      firstLine,
    }: { firstLine?: string; headersClass: typeof Map | typeof Headers } = {
      headersClass: Map,
    }
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
    const canAppend = headers instanceof Headers;

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
          try {
            if (canAppend && name.toLowerCase() === "set-cookie") {
              headers.append(name, value);
            } else {
              headers.set(name, value);
            }
          } catch (e) {
            // ignore
          }
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
      try {
        if (canAppend && name.toLowerCase() === "set-cookie") {
          headers.append(name, value);
        } else {
          headers.set(name, value);
        }
      } catch (e) {
        // ignore
      }
    }

    return new StatusAndHeaders({
      statusline,
      headers,
    });
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
  iter: AsyncIterator<Uint8Array, void, unknown>
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
