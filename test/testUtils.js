import test from "ava";
import "./utils/";

import { jsonToQueryString, postToGetUrl, getSurt } from "../src/utils";

async function toQuery(t, json, expected) {
  const actual = jsonToQueryString(json);
  t.is(actual, expected);
}

async function testPTG(t, request, url) {
  const actual = postToGetUrl(request);
  t.is(actual, true);
  t.is(request.url, url);
}

function testSURT(t, orig, surt) {
  const res = getSurt(orig);
  t.is(res, surt);
}

test("json to query simple", toQuery,
  {"abc": "def", "a": 4},
  "abc=def&a=4"
);

test("json to query with dupes", toQuery,
  {"abc": "def", "a": 4, "foo": {"bar": "123", "a": "5"}},
  "abc=def&a=4&bar=123&a.2_=5"
);

test("json to query with more dupes", toQuery, {
  "abc": "def",
  "some": {
    "data": "bar",
    "bar": 2,
    "a": 3
  },
  "a": "4",
  "foo": {
    "bar": "123",
    "a": "5"
  }},
"abc=def&data=bar&bar=2&a=3&a.2_=4&bar.2_=123&a.3_=5"
);

test("post-to-get empty", testPTG, 
  {
    "postData": "",
    "headers": new Headers(),
    "method": "POST",
    "url": "https://example.com/path/file"
  }, "https://example.com/path/file?__wb_method=POST&__wb_post_data=");



test("post-to-get binary", testPTG, 
  {
    "postData": new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]),
    "headers": new Headers({"Content-Type": "application/octet-stream"}),
    "method": "POST",
    "url": "https://example.com/path/file"
  }, "https://example.com/path/file?__wb_method=POST&__wb_post_data=AQIDBAUG");



test("surt with www", testSURT,
  "https://www23.example.com/some/path",
  "com,example)/some/path"
);

test("surt with www in middle", testSURT,
  "https://example.com/www2.example/some/value",
  "com,example)/www2.example/some/value"
);

test("surt with www in middle host", testSURT,
  "https://abc.www.example.com/example",
  "com,example,www,abc)/example"
);

test("surt with default port https", testSURT,
  "https://www.example.com:443/some/path",
  "com,example)/some/path"
);

test("surt with default port http", testSURT,
  "http://www.example.com:80/some/path",
  "com,example)/some/path"
);

test("surt with default custom port", testSURT,
  "https://www.example.com:123/some/path",
  "com,example:123)/some/path"
);

test("surt with query args sorted, lowercase", testSURT,
  "https://www.example.com/some/path?D=1&CC=2&EE=3",
  "com,example)/some/path?cc=2&d=1&ee=3"
);

