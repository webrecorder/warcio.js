
function getSurt(url) {
  try {
    if (!url.startsWith("https:") && !url.startsWith("http:")) {
      return url;
    }
    url = url.replace(/www\d*\./, '');
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

function postToGetUrl(request) {
  let {url, method, headers, postData} = request;

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

    case "text/plain":
    case "application/json":
      query = jsonToQueryString(decodeIfNeeded(postData));
      break;

    case "multipart/form-data":
      query = mfdToQueryString(decodeIfNeeded(postData), headers.get("content-type"));
      break;

    default:
      return false;
  }

  if (query)  {
    request.url = appendRequestQuery(request.url, query, request.method);
    request.method = "GET";
    request.requestBody = query;
    return true;
  }

  return false;
}

function appendRequestQuery(url, query, method) {
  if (!method) {
    return url;
  }

  const start = (url.indexOf("?") > 0 ? "&" : "?");

  return `${url}${start}__wb_method=${method}&${query}`;
}

function jsonToQueryString(json) {
  if (typeof(json) === "string") {
    try {
      json = JSON.parse(json);
    } catch(e) {
      json = {};
    }
  }

  const q = new URLSearchParams();

  try {
    JSON.stringify(json, (k, v) => {
      if (!["object", "function"].includes(typeof(v))) {
        q.set(k, v);
      }
      return v;
    });
  } catch (e) {}

  return q.toString();
}

function mfdToQueryString(mfd, contentType) {
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

  } catch (e) {}

  return params.toString();
}

export { postToGetUrl, getSurt, appendRequestQuery };
