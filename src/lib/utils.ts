import { Request } from "./types";
import type { ReadStream } from "fs";

export function binaryToString(data: Uint8Array | string) {
  let string;

  if (typeof data === "string") {
    string = data;
  } else if (data && data.length) {
    string = data.reduce((accumulator, value) => {
      accumulator += String.fromCharCode(value);
      return accumulator;
    }, "");
  } else if (data) {
    string = data.toString();
  } else {
    string = "";
  }
  return "__wb_post_data=" + btoa(string);
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
      urlObj.searchParams.sort();
      surt += urlObj.search;
      for (const [key, value] of urlObj.searchParams.entries()) {
        if (!value) {
          const rx = new RegExp(`(?<=[&?])${rxEscape(key)}=(?=&|$)`);
          if (!rx.exec(urlLower)) {
            surt = surt.replace(rx, key);
          }
        }
      }
    }
    return surt;
  } catch (e) {
    return url;
  }
}

export function postToGetUrl(request: Request) {
  let { method, headers, postData } = request;

  if (method === "GET") {
    return false;
  }

  const requestMime = (headers.get("content-type") || "").split(";")[0];

  function decodeIfNeeded(postData: Uint8Array | string): string {
    if (postData instanceof Uint8Array) {
      postData = new TextDecoder().decode(postData);
    }
    return postData;
  }

  let query = "";

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
      } catch (e) {
        query = binaryToString(postData);
      }
      break;

    case "multipart/form-data":
      const content_type = headers.get("content-type");
      if (!content_type) {
        throw new Error(
          "utils cannot call postToGetURL when missing content-type header"
        );
      }
      query = mfdToQueryString(decodeIfNeeded(postData), content_type);
      break;

    default:
      query = binaryToString(postData);
  }

  if (query !== null) {
    request.url = appendRequestQuery(request.url, query, request.method);
    request.method = "GET";
    request.requestBody = query;
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

export function jsonToQueryParams(json: string | any, ignoreInvalid = true) {
  if (typeof json === "string") {
    try {
      json = JSON.parse(json);
    } catch (e) {
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
    return key + "." + ++dupes[key] + "_";
  };

  try {
    JSON.stringify(json, (k, v) => {
      if (!["object", "function"].includes(typeof v)) {
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

export function mfdToQueryParams(
  mfd: string | Uint8Array,
  contentType: string
) {
  const params = new URLSearchParams();

  if (mfd instanceof Uint8Array) {
    mfd = new TextDecoder().decode(mfd);
  }

  try {
    const boundary = contentType.split("boundary=")[1];

    const parts = mfd.split(new RegExp("-*" + boundary + "-*", "mi"));

    for (let i = 0; i < parts.length; i++) {
      const m = parts[i]!.trim().match(/name="([^"]+)"\r\n\r\n(.*)/im);
      if (m) {
        params.set(m[1]!, m[2]!);
      }
    }
  } catch (e) {
    // ignore invalid, don't add params
  }

  return params;
}

export function jsonToQueryString(json: any, ignoreInvalid = true) {
  return jsonToQueryParams(json, ignoreInvalid).toString();
}

export function mfdToQueryString(
  mfd: string | Uint8Array,
  contentType: string
) {
  return mfdToQueryParams(mfd, contentType).toString();
}

// ===========================================================================
// parsing utils

export function concatChunks(chunks: Uint8Array[], size: number): Uint8Array {
  if (chunks.length === 1) {
    return chunks[0] as Uint8Array;
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
  inx: number
): [Uint8Array, Uint8Array] {
  return [chunk.slice(0, inx), chunk.slice(inx)];
}
