


export function binaryToString(data) {
  let string;

  if (typeof(data) === "string") {
    string = data;
  } else if (data && data.length) {
    string = "";
    for (let i = 0; i < data.length; i++) {
      string += String.fromCharCode(data[i]);
    }
  } else if (data) {
    string = data.toString();
  } else {
    string = "";
  }
  return "__wb_post_data=" + btoa(string);
}

export function getSurt(url) {
  try {
    if (!url.startsWith("https:") && !url.startsWith("http:")) {
      return url;
    }
    url = url.replace(/^(https?:\/\/)www\d*\./, "$1");
    const urlObj = new URL(url.toLowerCase());

    const hostParts = urlObj.hostname.split(".").reverse();
    let surt = hostParts.join(",");
    if (urlObj.port) {
      surt += ":" + urlObj.port;
    }
    surt += ")";
    surt += urlObj.pathname;
    if (urlObj.search) {
      urlObj.searchParams.sort();
      surt += urlObj.search;
    }
    return surt;
  } catch (e) {
    return url;
  }
}

export function postToGetUrl(request) {
  let {method, headers, postData} = request;

  if (method === "GET") {
    return false;
  }

  const requestMime = (headers.get("content-type") || "").split(";")[0];

  function decodeIfNeeded(postData) {
    if (postData instanceof Uint8Array) {
      postData = new TextDecoder().decode(postData);
    }
    return postData;
  }

  let query = null;

  switch (requestMime) {
  case "application/x-www-form-urlencoded":
    query = decodeIfNeeded(postData);
    break;

  case "application/json":
    query = jsonToQueryString(decodeIfNeeded(postData));
    break;

  case "text/plain":
    try {
      query = jsonToQueryString(decodeIfNeeded(postData), false);
    } catch(e) {
      query = binaryToString(postData);
    }
    break;

  case "multipart/form-data":
    query = mfdToQueryString(decodeIfNeeded(postData), headers.get("content-type"));
    break;

  default:
    query = binaryToString(postData);
  }

  if (query !== null)  {
    request.url = appendRequestQuery(request.url, query, request.method);
    request.method = "GET";
    request.requestBody = query;
    return true;
  }

  return false;
}

export function appendRequestQuery(url, query, method) {
  if (!method) {
    return url;
  }

  const start = (url.indexOf("?") > 0 ? "&" : "?");

  return `${url}${start}__wb_method=${method}&${query}`;
}

export function jsonToQueryParams(json, ignoreInvalid = true) {
  if (typeof(json) === "string") {
    try {
      json = JSON.parse(json);
    } catch(e) {
      json = {};
    }
  }

  const q = new URLSearchParams();

  const dupes = {};

  const getKey = (key) => {
    if (!q.has(key)) {
      return key;
    }

    if (!dupes[key]) {
      dupes[key] = 1;
    }
    return key + "." + (++dupes[key]) + "_";
  };

  try {
    JSON.stringify(json, (k, v) => {
      if (!["object", "function"].includes(typeof(v))) {
        q.set(getKey(k), v);
      }
      return v;
    });
  } catch (e) {
    if (!ignoreInvalid) {
      throw e;
    }
  }

  return q;
}

export function mfdToQueryParams(mfd, contentType) {
  const params = new URLSearchParams();

  if (mfd instanceof Uint8Array) {
    mfd = new TextDecoder().decode(mfd);
  }

  try {
    const boundary = contentType.split("boundary=")[1];

    const parts = mfd.split(new RegExp("-*" + boundary + "-*", "mi"));

    for (let i = 0; i < parts.length; i++) {
      const m = parts[i].trim().match(/name="([^"]+)"\r\n\r\n(.*)/mi);
      if (m) {
        params.set(m[1], m[2]);
      }
    }

  } catch (e) {
    // ignore invalid, don't add params
  }

  return params;
}


export function jsonToQueryString(json, ignoreInvalid=true) {
  return jsonToQueryParams(json, ignoreInvalid).toString();
}

export function mfdToQueryString(mfd, contentType) {
  return mfdToQueryParams(mfd, contentType).toString();
}


// ===========================================================================
// parsing utils

const decoder = new TextDecoder("utf-8");


export function concatChunks(chunks, size) {
  if (chunks.length === 1) {
    return chunks[0];
  }
  const buffer = new Uint8Array(size);

  let offset = 0;

  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return buffer;
}

export function splitChunk(chunk, inx) {
  return [chunk.slice(0, inx), chunk.slice(inx)];
}



export async function indexOfDoubleLine(buffer, iter) {
  let start = 0;

  for (let i = 0; i < buffer.length - 4; i++) {
    const inx = buffer.indexOf(13, start);
    if (inx < 0) {
      break;
    }

    if (inx + 3 >= buffer.length) {
      const {value} = await iter.next();
      if (!value) {
        break;
      }

      const newBuff = new Uint8Array(value.length + buffer.length);
      newBuff.set(buffer, 0);
      newBuff.set(value, buffer.length);
      buffer = newBuff;
    }

    if (buffer[inx + 1] === 10 && buffer[inx + 2] === 13 && buffer[inx + 3] === 10) {
      return [inx + 3, buffer];
    }

    start = inx + 1;
  }

  return [-1, buffer];
}

export async function readtoCRLFCRLF(reader) {
  const chunks = [];
  let size = 0;

  let inx;

  let lastChunk = null;

  const iter = reader[Symbol.asyncIterator]();

  for await (let chunk of iter) {
    [inx, chunk] = await indexOfDoubleLine(chunk, iter);

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


