import test from "ava";

import { jsonToQueryString } from "../src/utils";

async function toQuery(t, json, expected) {
  const actual = jsonToQueryString(json);
  t.is(actual, expected);
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
