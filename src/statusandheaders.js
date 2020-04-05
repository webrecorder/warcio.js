

// ===========================================================================
class StatusAndHeaders {
  constructor({statusline, headers, protocol = "", statusText = ""}) {
    this.statusline = statusline;
    this.headers = headers;
    this.protocol = protocol;
    this.statusText = statusText;
  }

  toString() {
    const buff = [this.statusline];

    for (const [name, value] of this.headers) {
      buff.push(`${name}: ${value}`);
    }

    return buff.join('\r\n') + '\r\n';
  }

  statusCode() {
    return Number(this.statusline.split(" ", 1)[0]) || 200;
  }
}

// ===========================================================================
class StatusAndHeadersParser {
  split(str, sep, limit) {
    const parts = str.split(sep);
    const newParts = parts.slice(0, limit);
    newParts.push(parts.slice(limit).join(sep));
    return newParts;
  }

  startsWithSpace(line) {
    const first = line.charAt(0);
    return first === " " || first === "\t";
  }

  async parse(stream, {fullStatusLine = null, headersClass = Map} = {}) {
    if (!fullStatusLine) {
      fullStatusLine = await stream.readline();
    }

    if (!fullStatusLine) {
      return null;
    }

    let statusline = fullStatusLine.trimEnd();

    const headers = new headersClass();

    if (!statusline) {
      return null;
      //return new StatusAndHeaders({statusline, headers, totalRead: this.totalRead});
    }

    let [ protocol, statusText ] = this.split(statusline, " ", 1);

    let line = (await stream.readline()).trimEnd();
    while (line) {
      let [name, value] = this.split(line, ":", 1);
      if (value) {
        name = name.trimStart();
        value = value.trim();
      }

      let nextLine = (await stream.readline()).trimEnd();

      while (this.startsWithSpace(nextLine)) {
        if (value) {
          value += nextLine;
        }

        nextLine = (await stream.readline()).trimEnd();
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

    statusText = statusText ? statusText.trim() : "";

    return new StatusAndHeaders({statusline, headers, protocol, statusText, totalRead: this.totalRead});
  }
}


// ===========================================================================
exports.StatusAndHeadersParser = StatusAndHeadersParser;
exports.StatusAndHeaders = StatusAndHeaders
