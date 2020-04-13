

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

    return buff.join('\r\n') + '\r\n';
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
    this._verb = parts[0];
    this._requestPath = parts.length > 1 ? parts[1] : "";
  }

  get verb() {
    if (this._verb === undefined) {
      this._parseRequestStatusLine();
    }
    return this._verb;
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
  startsWithSpace(line) {
    const first = line.charAt(0);
    return first === " " || first === "\t";
  }

  async parse(reader, {headersClass = Map} = {}) {
    const fullStatusLine = await reader.readline();

    if (!fullStatusLine) {
      return null;
    }

    let statusline = fullStatusLine.trimEnd();

    const headers = new headersClass();

    if (!statusline) {
      return null;
      //return new StatusAndHeaders({statusline, headers, totalRead: this.totalRead});
    }

    let line = (await reader.readline()).trimEnd();
    while (line) {
      let [name, value] = splitRemainder(line, ":", 1);
      if (value) {
        name = name.trimStart();
        value = value.trim();
      }

      let nextLine = (await reader.readline()).trimEnd();

      while (this.startsWithSpace(nextLine)) {
        if (value) {
          value += nextLine;
        }

        nextLine = (await reader.readline()).trimEnd();
      }

      if (value) {
        try {
          headers.set(name, value);
        } catch(e) {
          // try to sanitize value, removing newlines
          //headers.set(name, value.replace(/[\r\n]+/g, ', '));
        }
      }
      line = nextLine;
    }

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
export { StatusAndHeaders, StatusAndHeadersParser };
