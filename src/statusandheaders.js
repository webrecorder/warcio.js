const CRLF = new Uint8Array([13, 10]);
const CRLFCRLF = new Uint8Array([13, 10, 13, 10]);

import { readtoCRLFCRLF } from "./utils";


// ===========================================================================
class StatusAndHeaders {
  constructor({statusline, headers}) {
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

  async* iterSerialize(encoder) {
    yield encoder.encode(this.statusline);
    yield CRLF;
    for (const [name, value] of this.headers) {
      yield encoder.encode(`${name}: ${value}\r\n`);
    }
  }

  _parseResponseStatusLine() {
    const parts = splitRemainder(this.statusline, " ", 2);
    this._protocol = parts[0];
    this._statusCode = parts.length > 1 ? Number(parts[1]): "";
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

  _parseRequestStatusLine() {
    const parts = this.statusline.split(" ", 2);
    this._method = parts[0];
    this._requestPath = parts.length > 1 ? parts[1] : "";
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
class StatusAndHeadersParser {
  async parse(reader, {headersClass = Map, firstLine} = {}) {
    const fullStatusLine = firstLine ? firstLine : await reader.readline();

    if (!fullStatusLine) {
      return null;
    }

    const statusline = fullStatusLine.trimEnd();

    if (!statusline) {
      return null;
    }

    const headers = new headersClass();

    const headerBuff = await readtoCRLFCRLF(reader);

    let start = 0;
    let nameEnd, valueStart, valueEnd;
    let name, value;

    while (start < headerBuff.length) {
      valueEnd = headerBuff.indexOf("\n", start);

      if (value && (headerBuff[start] === " " || headerBuff[start] === "\t")) {
        value += headerBuff.slice(start, valueEnd < 0 ? undefined : valueEnd).trimEnd();

      } else {
        if (value) {
          try {
            headers.set(name, value);
          } catch(e) {
            // ignore
          }
          value = null;
        }

        nameEnd = headerBuff.indexOf(":", start);

        valueStart = nameEnd < 0 ? start : nameEnd + 1;

        if (nameEnd >= 0 && nameEnd < valueEnd) {
          name = headerBuff.slice(start, nameEnd).trimStart();
          value = headerBuff.slice(valueStart, valueEnd < 0 ? undefined : valueEnd).trim();
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
        headers.set(name, value);
      } catch(e) {
        // ignore
      }
    }

    /*
    const lines = headerBuff.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trimEnd();

      if (!line) {
        continue;
      }

      let [name, value] = splitRemainder(line, ":", 1);
      if (value) {
        name = name.trimStart();
        value = value.trimStart();
      }

      while ((i + 1) < lines.length && this.startsWithSpace(lines[i + 1])) {
        if (value) {
          value += lines[i + 1].trimEnd();
        }
        i++;
      }

      if (value) {
        try {
          headers.set(name, value);
        } catch(e) {
          // try to sanitize value, removing newlines
          //headers.set(name, value.replace(/[\r\n]+/g, ', '));
        }
      }
    }
*/
    return new StatusAndHeaders({statusline, headers, totalRead: this.totalRead});
  }
}

function splitRemainder(str, sep, limit) {
  const parts = str.split(sep);
  const newParts = parts.slice(0, limit);
  const rest = parts.slice(limit);
  if (rest.length > 0) {
    newParts.push(parts.slice(limit).join(sep));
  }
  return newParts;
}



// ===========================================================================
export { StatusAndHeaders, StatusAndHeadersParser, CRLF, CRLFCRLF };
