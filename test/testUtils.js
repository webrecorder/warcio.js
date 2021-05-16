import test from "ava";
import "./utils/";

import { jsonToQueryString, postToGetUrl } from "../src/utils";

async function toQuery(t, json, expected) {
  const actual = jsonToQueryString(json);
  t.is(actual, expected);
}

async function testPTG(t, request, url) {
  const actual = postToGetUrl(request);
  t.is(actual, true);
  t.is(request.url, url);
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


