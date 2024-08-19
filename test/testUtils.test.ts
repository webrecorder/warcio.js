import { jsonToQueryString, postToGetUrl, getSurt } from "../src/lib";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toQuery(json: Record<string, any>) {
  return jsonToQueryString(json);
}

describe("utils", () => {
  test("json to query simple", () => {
    expect(toQuery({ abc: "def", a: 4 })).toBe("abc=def&a=4");
  });

  test("json to query with dupes", () => {
    expect(toQuery({ abc: "def", a: 4, foo: { bar: "123", a: "5" } })).toBe(
      "abc=def&a=4&bar=123&a.2_=5",
    );
  });

  test("json to query with more dupes", () => {
    expect(
      toQuery({
        abc: "def",
        some: {
          data: "bar",
          bar: 2,
          a: 3,
        },
        a: "4",
        foo: {
          bar: "123",
          a: "5",
        },
      }),
    ).toBe("abc=def&data=bar&bar=2&a=3&a.2_=4&bar.2_=123&a.3_=5");
  });

  test("another json with more complicated data", () => {
    expect(
      toQuery({
        type: "event",
        id: 44.0,
        float: 35.7,
        values: [true, false, null],
        source: {
          type: "component",
          id: "a+b&c= d",
          values: [3, 4],
        },
      }),
    ).toBe(
      "type=event&id=44&float=35.7&values=true&values.2_=false&values.3_=null&type.2_=component&id.2_=a%2Bb%26c%3D+d&values.4_=3&values.5_=4",
    );
  });

  test("post-to-get empty", () => {
    const request = {
      postData: "",
      headers: new Headers(),
      method: "POST",
      url: "https://example.com/path/file",
    };
    const result = postToGetUrl(request);
    expect(result).toBe(true);
    expect(request.url).toBe(
      "https://example.com/path/file?__wb_method=POST&__wb_post_data=",
    );
  });

  test("post-to-get binary", () => {
    const request = {
      postData: new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]),
      headers: new Headers({ "Content-Type": "application/octet-stream" }),
      method: "POST",
      url: "https://example.com/path/file",
    };
    const result = postToGetUrl(request);
    expect(result).toBe(true);
    expect(request.url).toBe(
      "https://example.com/path/file?__wb_method=POST&__wb_post_data=AQIDBAUG",
    );
  });

  test("surt with www", () => {
    expect(getSurt("https://www23.example.com/some/path")).toBe(
      "com,example)/some/path",
    );
  });

  test("surt with www in middle", () => {
    expect(getSurt("https://example.com/www2.example/some/value")).toBe(
      "com,example)/www2.example/some/value",
    );
  });

  test("surt with www in middle host", () => {
    expect(getSurt("https://abc.www.example.com/example")).toBe(
      "com,example,www,abc)/example",
    );
  });

  test("surt with default port https", () => {
    expect(getSurt("https://www.example.com:443/some/path")).toBe(
      "com,example)/some/path",
    );
  });

  test("surt with default port https", () => {
    expect(getSurt("https://www.example.com:443/some/path")).toBe(
      "com,example)/some/path",
    );
  });

  test("surt with default port http", () => {
    expect(getSurt("http://www.example.com:80/some/path")).toBe(
      "com,example)/some/path",
    );
  });

  test("surt with default custom port", () => {
    expect(getSurt("https://www.example.com:123/some/path")).toBe(
      "com,example:123)/some/path",
    );
  });

  test("surt with query args sorted, lowercase", () => {
    expect(getSurt("https://www.example.com/some/path?D=1&CC=2&EE=3")).toBe(
      "com,example)/some/path?cc=2&d=1&ee=3",
    );
  });

  test("surt with no = param, lowercase", () => {
    expect(getSurt("https://www.example.com/some/path?a=b&c&cc=1&d=e")).toBe(
      "com,example)/some/path?a=b&c&cc=1&d=e",
    );
  });

  test("surt with no = param, sort", () => {
    expect(getSurt("https://www.example.com/some/path?a=b&c=d&*&z")).toBe(
      "com,example)/some/path?*&a=b&c=d&z",
    );
  });

  test("surt with %-encoded query, trailing = param", () => {
    expect(getSurt("https://www.example.com/some/path?a=b&c=d&e^=&z")).toBe(
      "com,example)/some/path?a=b&c=d&e%5E=&z"
    );
  });
  test("surt with %-encoded query, no trailing = param", () => {
    expect(getSurt("https://www.example.com/some/path?a=b&c=d&e^&z")).toBe(
      "com,example)/some/path?a=b&c=d&e%5E&z"
    );
  });

});
