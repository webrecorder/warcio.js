import { inflate, Deflate } from "pako";
import { WARCRecord, WARCParser, WARCSerializer } from "../lib";

const decoder = new TextDecoder("utf-8");
const encoder = new TextEncoder();

async function* iter(data: string) {
  yield encoder.encode(data);
}

describe("serializer", () => {
  test("compute digest, buffering", async () => {
    const input =
      '\
WARC/1.0\r\n\
WARC-Type: response\r\n\
WARC-Record-ID: <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
WARC-Target-URI: http://example.com/\r\n\
WARC-Date: 2000-01-01T00:00:00Z\r\n\
Content-Type: application/http; msgtype=response\r\n\
Content-Length: 97\r\n\
\r\n\
HTTP/1.0 200 OK\r\n\
Content-Type: text/plain; charset="UTF-8"\r\n\
Custom-Header: somevalue\r\n\
\r\n\
some\n\
text\r\n\r\n';

    const record = (await WARCParser.parse(iter(input), {
      keepHeadersCase: true,
    }))!;
    expect(record).not.toBeNull();
    expect(record.warcType).toBe("response");

    const res = await WARCSerializer.serialize(record, {
      digest: { algo: "sha-1", prefix: "sha1:", base32: true },
    });

    expect(decoder.decode(res)).toBe(
      '\
WARC/1.0\r\n\
WARC-Type: response\r\n\
WARC-Record-ID: <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
WARC-Target-URI: http://example.com/\r\n\
WARC-Date: 2000-01-01T00:00:00Z\r\n\
Content-Type: application/http; msgtype=response\r\n\
Content-Length: 97\r\n\
WARC-Payload-Digest: sha1:B6QJ6BNJ3R4B23XXMRKZKHLPGJY2VE4O\r\n\
WARC-Block-Digest: sha1:OS3OKGCWQIJOAOC3PKXQOQFD52NECQ74\r\n\
\r\n\
HTTP/1.0 200 OK\r\n\
Content-Type: text/plain; charset="UTF-8"\r\n\
Custom-Header: somevalue\r\n\
\r\n\
some\n\
text\r\n\r\n'
    );
  });

  test("compute digest, create record", async () => {
    async function* reader() {
      yield encoder.encode("so");
      yield encoder.encode("me\n");
      yield encoder.encode("text");
    }

    const url = "http://example.com/";
    const date = "2000-01-01T00:00:00Z";
    const type = "response";
    const warcHeaders = {
      "WARC-Record-ID": "<urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>",
    };
    const httpHeaders = {
      "Custom-Header": "somevalue",
      "Content-Type": 'text/plain; charset="UTF-8"',
    };

    const keepHeadersCase = true;

    const record = await WARCRecord.create(
      {
        url,
        date,
        type,
        warcHeaders,
        httpHeaders,
        keepHeadersCase,
      },
      reader()
    );

    expect(record.warcType).toBe("response");

    const res = decoder.decode(
      await WARCSerializer.serialize(record, {
        digest: { algo: "sha-1", prefix: "sha1:", base32: true },
      })
    );

    expect(res).toBe(
      '\
WARC/1.0\r\n\
WARC-Record-ID: <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
WARC-Target-URI: http://example.com/\r\n\
WARC-Date: 2000-01-01T00:00:00Z\r\n\
WARC-Type: response\r\n\
Content-Type: application/http; msgtype=response\r\n\
WARC-Payload-Digest: sha1:B6QJ6BNJ3R4B23XXMRKZKHLPGJY2VE4O\r\n\
WARC-Block-Digest: sha1:RWTAQVAD4VNT7PHWNDQE6LZLGGV3Z3AZ\r\n\
Content-Length: 97\r\n\
\r\n\
HTTP/1.1 200 OK\r\n\
Custom-Header: somevalue\r\n\
Content-Type: text/plain; charset="UTF-8"\r\n\
\r\n\
some\n\
text\r\n\r\n'
    );
  });

  test("test auto record id, current date", async () => {
    async function* payload() {
      yield encoder.encode("some text");
    }

    const url = "urn:custom:http://example.com/";
    const type = "resource";
    const warcHeaders = { "Content-Type": "text/plain" };

    const record = await WARCRecord.create(
      { url, type, warcHeaders },
      payload()
    );

    expect(record.warcContentType).toBe("text/plain");
    expect(record.warcDate).not.toBeNull();
    expect(record.warcHeader("WARC-Record-ID")).not.toBeNull();
    expect(record.warcPayloadDigest).not.toBeNull();
    expect(record.warcPayloadDigest).toBe(record.warcBlockDigest);
  });

  test("test default content-type for resource", async () => {
    async function* payload() {
      yield encoder.encode("some text");
    }

    const url = "urn:custom:http://example.com/";
    const type = "resource";
    const warcHeaders = {};

    const record = await WARCRecord.create(
      { url, type, warcHeaders },
      payload()
    );

    expect(record.warcContentType).toBe("application/octet-stream");
    expect(record.warcDate).not.toBeNull();
    expect(record.warcHeader("WARC-Record-ID")).not.toBeNull();
    expect(record.warcPayloadDigest).not.toBeNull();
    expect(record.warcPayloadDigest).toBe(record.warcBlockDigest);
  });

  const createRecordGzipped = async () => {
    async function* reader() {
      yield encoder.encode("so");
      yield encoder.encode("me\n");
      yield encoder.encode("text");
    }

    const url = "http://example.com/";
    const date = "2000-01-01T00:00:00Z";
    const type = "response";
    const warcHeaders = {
      "WARC-Record-ID": "<urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>",
    };
    const httpHeaders = {
      "Custom-Header": "somevalue",
      "Content-Type": 'text/plain; charset="UTF-8"',
    };

    const statusline = "HTTP/1.1 404 Not Found";

    const record = await WARCRecord.create(
      {
        url,
        date,
        type,
        warcHeaders,
        httpHeaders,
        statusline,
      },
      reader()
    );

    expect(record.warcType).toBe("response");

    const gzipped = await WARCSerializer.serialize(record, { gzip: true });
    const res = decoder.decode(inflate(gzipped));

    expect(res).toBe(
      '\
WARC/1.0\r\n\
WARC-Record-ID: <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
WARC-Target-URI: http://example.com/\r\n\
WARC-Date: 2000-01-01T00:00:00Z\r\n\
WARC-Type: response\r\n\
Content-Type: application/http; msgtype=response\r\n\
WARC-Payload-Digest: sha256:e8e5bf447c352c0080e1444994b0cc1fbe7a25f3ea637c5c89f595b6a95c9253\r\n\
WARC-Block-Digest: sha256:9b5a9b1d4a0263075b50a47dc2326320f6083f3800ddf7ae079ebbb661b3ffc9\r\n\
Content-Length: 104\r\n\
\r\n\
HTTP/1.1 404 Not Found\r\n\
Custom-Header: somevalue\r\n\
Content-Type: text/plain; charset="UTF-8"\r\n\
\r\n\
some\n\
text\r\n\r\n'
    );
  };

  test("compute digest, create record, gzipped", createRecordGzipped);

  test("create request record", async () => {
    const url = "http://example.com/";
    const date = "2000-01-01T00:00:00Z";
    const type = "request";
    const warcHeaders = {
      "WARC-Record-ID": "<urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>",
    };
    const httpHeaders = {
      Accept: "*/*",
    };

    const statusline = "GET /file HTTP/1.1";

    const record = await WARCRecord.create({
      url,
      date,
      type,
      warcHeaders,
      httpHeaders,
      statusline,
    });

    expect(record.warcType).toBe("request");

    const gzipped = await WARCSerializer.serialize(record, { gzip: true });
    const res = decoder.decode(inflate(gzipped));

    expect(res).toBe(
      "\
WARC/1.0\r\n\
WARC-Record-ID: <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
WARC-Target-URI: http://example.com/\r\n\
WARC-Date: 2000-01-01T00:00:00Z\r\n\
WARC-Type: request\r\n\
Content-Type: application/http; msgtype=request\r\n\
WARC-Payload-Digest: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\r\n\
WARC-Block-Digest: sha256:bae4ef8a0c1f20864d3cf60e7bba15c5f1b8d15fd6d18bdfffcd41ab57d9b1dc\r\n\
Content-Length: 35\r\n\
\r\n\
GET /file HTTP/1.1\r\n\
Accept: */*\r\n\
\r\n\
\r\n\
\r\n\
"
    );
  });

  test("create warcinfo", async () => {
    const filename = "/my/web/archive.warc";
    const type = "warcinfo";
    const date = "2020-06-06T07:07:04.923Z";

    const fields = {
      software: "warcio.js test",
      format: "WARC File Format 1.1",
      creator: "test-case",
      isPartOf: "test",
    };

    const warcHeaders = {
      "WARC-Record-ID": "<urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>",
    };

    const warcVersion = "WARC/1.1";

    const record = await WARCRecord.createWARCInfo(
      {
        filename,
        warcHeaders,
        date,
        type,
        warcVersion,
      },
      fields
    );

    const res = decoder.decode(await WARCSerializer.serialize(record));

    expect(res).toBe(
      "\
WARC/1.1\r\n\
WARC-Record-ID: <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
WARC-Filename: /my/web/archive.warc\r\n\
WARC-Date: 2020-06-06T07:07:04.923Z\r\n\
WARC-Type: warcinfo\r\n\
Content-Type: application/warc-fields\r\n\
Content-Length: 92\r\n\
\r\n\
software: warcio.js test\r\n\
format: WARC File Format 1.1\r\n\
creator: test-case\r\n\
isPartOf: test\r\n\
\r\n\
\r\n\
"
    );
  });

  test("create revisit, no http headers", async () => {
    const url = "https://example.com/another/file.html";
    const type = "revisit";
    const date = "2020-06-06T07:07:04.923Z";
    const refersToDate = "2020-12-26T07:07:04.12";
    const refersToUrl = "https://example.com/";

    const warcHeaders = {
      "WARC-Payload-Digest":
        "sha256:e8e5bf447c352c0080e1444994b0cc1fbe7a25f3ea637c5c89f595b6a95c9253",
      "WARC-Record-ID": "<urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>",
    };

    const record = await WARCRecord.create(
      {
        url,
        date,
        type,
        warcHeaders,
        refersToUrl,
        refersToDate,
      },
      iter("")
    );

    const res = decoder.decode(await WARCSerializer.serialize(record));

    expect(res).toBe(
      "\
WARC/1.0\r\n\
WARC-Payload-Digest: sha256:e8e5bf447c352c0080e1444994b0cc1fbe7a25f3ea637c5c89f595b6a95c9253\r\n\
WARC-Record-ID: <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
WARC-Target-URI: https://example.com/another/file.html\r\n\
WARC-Date: 2020-06-06T07:07:04Z\r\n\
WARC-Type: revisit\r\n\
WARC-Profile: http://netpreserve.org/warc/1.0/revisit/identical-payload-digest\r\n\
WARC-Refers-To-Target-URI: https://example.com/\r\n\
WARC-Refers-To-Date: 2020-12-26T07:07:04Z\r\n\
Content-Type: application/http; msgtype=response\r\n\
Content-Length: 0\r\n\
\r\n\
\r\n\
\r\n"
    );
  });

  test("create revisit, with http headers", async () => {
    const url = "https://example.com/another/file.html";
    const type = "revisit";
    const date = "2020-06-06T07:07:04.923Z";
    const refersToDate = "2020-12-26T07:07:04.12";
    const refersToUrl = "https://example.com/";

    const warcHeaders = {
      "WARC-Payload-Digest":
        "sha256:e8e5bf447c352c0080e1444994b0cc1fbe7a25f3ea637c5c89f595b6a95c9253",
      "WARC-Record-ID": "<urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>",
    };

    const httpHeaders = { "Content-Type": "text/html", Foo: "Bar" };

    const record = await WARCRecord.create(
      {
        url,
        date,
        type,
        warcHeaders,
        refersToUrl,
        refersToDate,
        httpHeaders,
      },
      iter("")
    );

    const res = decoder.decode(await WARCSerializer.serialize(record));

    expect(res).toBe(
      "\
WARC/1.0\r\n\
WARC-Payload-Digest: sha256:e8e5bf447c352c0080e1444994b0cc1fbe7a25f3ea637c5c89f595b6a95c9253\r\n\
WARC-Record-ID: <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
WARC-Target-URI: https://example.com/another/file.html\r\n\
WARC-Date: 2020-06-06T07:07:04Z\r\n\
WARC-Type: revisit\r\n\
WARC-Profile: http://netpreserve.org/warc/1.0/revisit/identical-payload-digest\r\n\
WARC-Refers-To-Target-URI: https://example.com/\r\n\
WARC-Refers-To-Date: 2020-12-26T07:07:04Z\r\n\
Content-Type: application/http; msgtype=response\r\n\
Content-Length: 54\r\n\
\r\n\
HTTP/1.1 200 OK\r\n\
Content-Type: text/html\r\n\
Foo: Bar\r\n\
\r\n\
\r\n\
\r\n\
"
    );
  });

  test("create record, gzipped, streaming", async () => {
    await createRecordGzipped();
  });
});
