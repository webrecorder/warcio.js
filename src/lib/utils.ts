import { type Request } from "./types";

export function binaryToString(data: Uint8Array | string | undefined | null) {
  let string;

  if (typeof data === "string") {
    string = data;
  } else if (data?.length) {
    string = data.reduce((accumulator, value) => {
      accumulator += String.fromCharCode(value);
      return accumulator;
    }, "");
  } else if (data) {
    string = data.toString();
  } else {
    string = "";
  }
  // try btoa, if it fails, just ignore the binary data string
  try {
    // eslint-disable-next-line deprecation/deprecation
    return "__wb_post_data=" + btoa(string);
  } catch (_e) {
    return "__wb_post_data=";
  }
}

export function rxEscape(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getSurt(url: string) {
  try {
    if (!url.startsWith("https:") && !url.startsWith("http:")) {
      return url;
    }
    url = url.replace(/^(https?:\/\/)www\d*\./, "$1");
    const urlLower = url.toLowerCase();
    const urlObj = new URL(urlLower);

    const hostParts = urlObj.hostname.split(".").reverse();
    let surt = hostParts.join(",");
    if (urlObj.port) {
      surt += ":" + urlObj.port;
    }
    surt += ")";
    surt += urlObj.pathname;
    if (urlObj.search) {
      const args = urlObj.search.slice(1).split("&");
      args.sort();
      surt += "?" + args.join("&");
    }
    return surt;
  } catch (_e) {
    return url;
  }
}

export function postToGetUrl(request: Request) {
  const { method, headers, postData = "" } = request;

  if (method === "GET") {
    return false;
  }

  const getContentType = (headers: Headers | Map<string, string>): string => {
    const ct = headers.get("content-type");
    if (ct) {
      return ct;
    }
    if (!(headers instanceof Headers)) {
      for (const [key, value] of headers.entries()) {
        if (key && key.toLowerCase() === "content-type") {
          return value;
        }
      }
    }
    return "";
  };

  const contentType = getContentType(headers);

  const requestMime = contentType.split(";")[0];

  function decodeIfNeeded(
    postData: Uint8Array | string | undefined | null,
  ): string | undefined | null {
    if (postData instanceof Uint8Array) {
      postData = new TextDecoder().decode(postData);
    }
    return postData;
  }

  let query: string | undefined | null = "";

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
      } catch (_e) {
        query = binaryToString(postData);
      }
      break;

    case "multipart/form-data": {
      if (!contentType) {
        throw new Error(
          "utils cannot call postToGetURL when missing content-type header",
        );
      }
      query = mfdToQueryString(decodeIfNeeded(postData), contentType);
      break;
    }

    default:
      query = binaryToString(postData);
  }

  if (query != null) {
    request.requestBody = query;
    try {
      query = decodeURI(query);
    } catch (_) {
      // just clear out invalid query string
      query = "";
    }

    request.url = appendRequestQuery(
      request.url,
      query,
      request.method,
    );
    request.method = "GET";
    return true;
  }

  return false;
}

export function appendRequestQuery(url: string, query: string, method: string) {
  if (!method) {
    return url;
  }

  const start = url.indexOf("?") > 0 ? "&" : "?";

  return `${url}${start}__wb_method=${method}&${query}`;
}

export function jsonToQueryParams(json: unknown, ignoreInvalid = true) {
  if (typeof json === "string") {
    try {
      json = JSON.parse(json);
    } catch (_e) {
      json = {};
    }
  }

  const q = new URLSearchParams();

  const dupes: Record<string, number> = {};

  const getKey = (key: string) => {
    if (!q.has(key)) {
      return key;
    }

    if (!(key in dupes)) {
      dupes[key] = 1;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion
    return key + "." + ++dupes[key]! + "_";
  };

  const parser = (jsonObj: unknown, key = "") => {
    let queryValue = "";

    // if object, attempt to recurse through key/value pairs
    if (typeof jsonObj === "object" && !(jsonObj instanceof Array)) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const [key, value] of Object.entries(jsonObj!)) {
          parser(value as object, key);
        }
      } catch (_e) {
        // special case for null
        if (jsonObj === null) {
          queryValue = "null";
        }
      }
    }

    // if array, recurse through values, re-using key
    else if (jsonObj instanceof Array) {
      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let i = 0; i < jsonObj.length; i++) {
        parser(jsonObj[i], key);
      }
    }

    if (["string", "number", "boolean"].includes(typeof jsonObj)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-base-to-string
      queryValue = jsonObj!.toString();
    }

    if (queryValue) {
      q.set(getKey(key), queryValue);
    }
  };

  try {
    parser(json);
  } catch (e) {
    if (!ignoreInvalid) {
      throw e;
    }
  }
  return q;
}

export function mfdToQueryParams(
  mfd: string | Uint8Array | undefined | null = "",
  contentType: string,
) {
  const params = new URLSearchParams();

  if (mfd instanceof Uint8Array) {
    mfd = new TextDecoder().decode(mfd);
  }

  try {
    const boundary = contentType.split("boundary=")[1];

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const parts = mfd!.split(new RegExp("-*" + boundary + "-*", "mi"));

    for (const part of parts) {
      const m = part.trim().match(/name="([^"]+)"\r\n\r\n(.*)/im);
      if (m) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- match checked
        params.set(m[1]!, m[2]!);
      }
    }
  } catch (_e) {
    // ignore invalid, don't add params
  }

  return params;
}

export function jsonToQueryString(
  json: string | Record<string, unknown> | undefined | null = "",
  ignoreInvalid = true,
) {
  return jsonToQueryParams(json, ignoreInvalid).toString();
}

export function mfdToQueryString(
  mfd: string | Uint8Array | undefined | null,
  contentType: string,
) {
  return mfdToQueryParams(mfd, contentType).toString();
}

// ===========================================================================
// parsing utils

export function concatChunks(chunks: Uint8Array[], size: number): Uint8Array {
  if (chunks.length === 1) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return chunks[0]!;
  }
  const buffer = new Uint8Array(size);

  let offset = 0;

  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return buffer;
}

export function splitChunk(
  chunk: Uint8Array,
  inx: number,
): [Uint8Array, Uint8Array] {
  return [chunk.slice(0, inx), chunk.slice(inx)];
}

// ===========================================================================
export function UTFToLatin1(value: string) {
  const buf = new TextEncoder().encode(value);

  let str = "";
  buf.forEach((x) => (str += String.fromCharCode(x)));
  return str;
}

// ===========================================================================
export function latin1ToUTF(str: string) {
  const buf = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    buf[i] = str.charCodeAt(i) & 0xff;
  }
  return new TextDecoder().decode(buf);
}

// ===========================================================================
// headers multi map
const MULTI_VALUE_ALLOWED = ["set-cookie", "warc-concurrent-to", "warc-protocol"];

// using something other than comma to reduce change of any collisions with actual data
// in theory, collision still possible with arbitrary cookie value
const JOIN_MARKER = ",,,";

export function multiValueHeader(name: string, value: string[]) {
  if (!MULTI_VALUE_ALLOWED.includes(name.toLowerCase())) {
    throw new Error("not a valid multi value header");
  }
  return value.join(JOIN_MARKER);
}

export class HeadersMultiMap extends Map<string, string> {
  constructor(headersInit?: HeadersInit) {
    // if an array of array, parse that and add individually here
    if (headersInit instanceof Array) {
      super();
      for (const entry of headersInit) {
        if (entry instanceof Array) {
          const name = entry[0];
          const value = entry[1];
          this.append(name, value);
        }
      }
    } else {
      super(headersInit ? Object.entries(headersInit) : undefined);
    }
  }

  getMultiple(name: string): string[] | undefined {
    const value = super.get(name);
    if (!value) {
      return undefined;
    }
    if (MULTI_VALUE_ALLOWED.includes(name.toLowerCase())) {
      return value.split(JOIN_MARKER);
    }
    return [value];
  }

  append(name: string, value: string) {
    if (MULTI_VALUE_ALLOWED.includes(name.toLowerCase())) {
      const prev = this.get(name);
      this.set(name, prev !== undefined ? prev + JOIN_MARKER + value : value);
    } else {
      this.set(name, value);
    }
  }

  override *[Symbol.iterator](): IterableIterator<[string, string]> {
    for (const [name, value] of super[Symbol.iterator]()) {
      if (MULTI_VALUE_ALLOWED.includes(name.toLowerCase())) {
        for (const v of value.split(JOIN_MARKER)) {
          yield [name, v];
        }
      } else {
        yield [name, value];
      }
    }
  }
}
