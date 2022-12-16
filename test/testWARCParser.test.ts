import {
  StatusAndHeadersParser,
  AsyncIterReader,
  WARCParser,
  WARCSerializer,
  concatChunks,
  WARCRecord,
  LimitReader,
} from "../src/lib";
import { getReader, getReadableStream } from "./utils";
import fs from "fs";
import path from "path";

const decoder = new TextDecoder("utf-8");

function get_warc_path(filename: string) {
  return new URL(filename, import.meta.url).pathname;
}



// ===========================================================================
// ===========================================================================
// Tests

test("StatusAndHeaders test 1", async () => {
  const parser = new StatusAndHeadersParser();
  const result = await parser.parse(
    new AsyncIterReader(
      getReader([
        "\
HTTP/1.0 200 OK\r\n\
Content-Type: ABC\r\n\
HTTP/1.0 200 OK\r\n\
Some: Value\r\n\
Multi-Line: Value1\r\n\
    Also This\r\n\
\r\n\
Body",
      ])
    )
  );
  expect(result?.toString()).toBe(`\
HTTP/1.0 200 OK\r
Content-Type: ABC\r
Some: Value\r
Multi-Line: Value1    Also This\r
`);
});

test("StatusAndHeaders test 2", async () => {
  const parser = new StatusAndHeadersParser();
  const result = await parser.parse(
    new AsyncIterReader(
      getReader([
        "\
HTTP/1.0 204 Empty\r\n\
Content-Type: Value\r\n\
%Invalid%\r\n\
\tMultiline\r\n\
Content-Length: 0\r\n\
Bad: multi\nline\r\n\
\r\n",
      ])
    )
  );
  expect(result?.toString()).toBe(`HTTP/1.0 204 Empty\r
Content-Type: Value\r
Content-Length: 0\r
Bad: multi\r
`);
});

test("StatusAndHeaders test 3", async () => {
  const parser = new StatusAndHeadersParser();
  const result = await parser.parse(
    new AsyncIterReader(getReader(["HTTP/1.0 204 None\r\n\r\n"]))
  );
  expect(result?.toString()).toBe("HTTP/1.0 204 None\r\n");
});

test("StatusAndHeaders test empty", async () => {
  const parser = new StatusAndHeadersParser();
  const result = await parser.parse(
    new AsyncIterReader(getReader(["\r\n\r\n"]))
  );
  expect(result).toBe(null);
});

test("Load WARC Records", async () => {
  const input =
    // eslint-disable-next-line quotes -- inner double quote
    '\
WARC/1.0\r\n\
WARC-Type: warcinfo\r\n\
WARC-Record-ID: <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
WARC-Filename: testfile.warc.gz\r\n\
WARC-Date: 2000-01-01T00:00:00Z\r\n\
Content-Type: application/warc-fields\r\n\
Content-Length: 86\r\n\
\r\n\
software: recorder test\r\n\
format: WARC File Format 1.0\r\n\
json-metadata: {"foo": "bar"}\r\n\
\r\n\
\r\n\
WARC/1.0\r\n\
WARC-Type: response\r\n\
WARC-Record-ID: <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
WARC-Target-URI: http://example.com/\r\n\
WARC-Date: 2000-01-01T00:00:00Z\r\n\
WARC-Payload-Digest: sha1:B6QJ6BNJ3R4B23XXMRKZKHLPGJY2VE4O\r\n\
WARC-Block-Digest: sha1:OS3OKGCWQIJOAOC3PKXQOQFD52NECQ74\r\n\
Content-Type: application/http; msgtype=response\r\n\
Content-Length: 97\r\n\
\r\n\
HTTP/1.0 200 OK\r\n\
Content-Type: text/plain; charset="UTF-8"\r\n\
Custom-Header: somevalue\r\n\
\r\n\
some\n\
text\r\n\
\r\n\
WARC/1.0\r\n\
WARC-Type: response\r\n\
WARC-Record-ID: <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
WARC-Target-URI: http://example.com/\r\n\
WARC-Date: 2000-01-01T00:00:00Z\r\n\
WARC-Payload-Digest: sha1:B6QJ6BNJ3R4B23XXMRKZKHLPGJY2VE4O\r\n\
WARC-Block-Digest: sha1:KMUABC6URWIQ7QXCZDQ5FS6WIBBFRORR\r\n\
Content-Type: application/http; msgtype=response\r\n\
Content-Length: 268\r\n\
\r\n\
HTTP/1.0 200 OK\r\n\
Content-Type: text/plain; charset="UTF-8"\r\n\
Content-Disposition: attachment; filename*=UTF-8\'\'%D0%B8%D1%81%D0%BF%D1%8B%D1%82%D0%B0%D0%BD%D0%B8%D0%B5.txt\r\n\
Custom-Header: somevalue\r\n\
Unicode-Header: %F0%9F%93%81%20text%20%F0%9F%97%84%EF%B8%8F\r\n\
\r\n\
more\n\
text\r\n\
\r\n\
';

  const reader = new AsyncIterReader(getReader([input]));

  let parser = new WARCParser(reader);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  const record0 = (await parser.parse())!;
  expect(record0).not.toBeNull();
  expect(record0.warcType).toBe("warcinfo");

  //const warcinfo = decoder.decode(await record0.readFully());

  let warcinfo = "";

  for await (const line of record0.iterLines()) {
    warcinfo += line;
  }

  expect(warcinfo).toBe(
    // eslint-disable-next-line quotes -- inner double quote
    '\
software: recorder test\r\n\
format: WARC File Format 1.0\r\n\
json-metadata: {"foo": "bar"}\r\n\
'
  );

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  const record = (await parser.parse())!;
  expect(record).not.toBeNull();
  expect(record.warcTargetURI, "http://example.com/");

  expect(decoder.decode(await record.readFully())).toBe("some\ntext");

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  const record2 = (await parser.parse())!;
  expect(record2).not.toBeNull();

  expect(decoder.decode(await record2.readFully())).toBe("more\ntext");

  expect(await parser.parse()).toBeNull();

  // reread payload
  expect(await record.contentText()).toBe("some\ntext");

  // iterate should return null
  let count = 0;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const chunk of record) {
    count++;
  }
  expect(count).toBe(0);

  // reread via getReadableStream
  parser = new WARCParser(getReader([input]));
  await parser.parse();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  const record4 = (await parser.parse())!;
  expect(record4).not.toBeNull();

  const reader2 = new AsyncIterReader(record4.getReadableStream().getReader());
  expect(decoder.decode(await reader2.readFully())).toBe("some\ntext");

  // test iterRecords
  for await (const arecord of WARCParser.iterRecords(getReader([input]))) {
    expect(arecord.warcType).not.toBeNull();
  }
});

test("Load revisit, no http headers", async () => {
  const input =
    "\
WARC/1.0\r\n\
WARC-Type: revisit\r\n\
WARC-Record-ID: <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
WARC-Target-URI: http://example.com/\r\n\
WARC-Date: 2000-01-01T00:00:00Z\r\n\
WARC-Profile: http://netpreserve.org/warc/1.0/revisit/identical-payload-digest\r\n\
WARC-Refers-To-Target-URI: http://example.com/foo\r\n\
WARC-Refers-To-Date: 1999-01-01T00:00:00Z\r\n\
WARC-Payload-Digest: sha1:B6QJ6BNJ3R4B23XXMRKZKHLPGJY2VE4O\r\n\
WARC-Block-Digest: sha1:3I42H3S6NNFQ2MSVX7XZKYAYSCX5QBYJ\r\n\
Content-Type: application/http; msgtype=response\r\n\
Content-Length: 0\r\n\
\r\n\
\r\n\
\r\n\
";
  const parser = new WARCParser(getReadableStream([input]), {
    keepHeadersCase: true,
  });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  const record = (await parser.parse())!;
  expect(record).not.toBeNull();

  expect(record.warcHeaders.protocol).toBe("WARC/1.0");
  expect(record.warcHeader("WARC-Record-ID")).toBe(
    "<urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>"
  );
  expect(record.warcType).toBe("revisit");
  expect(record.warcTargetURI).toBe("http://example.com/");
  expect(record.warcDate).toBe("2000-01-01T00:00:00Z");
  expect(record.warcRefersToTargetURI).toBe("http://example.com/foo");
  expect(record.warcRefersToDate).toBe("1999-01-01T00:00:00Z");
  expect(record.warcPayloadDigest).toBe(
    "sha1:B6QJ6BNJ3R4B23XXMRKZKHLPGJY2VE4O"
  );
  expect(record.warcContentType).toBe("application/http; msgtype=response");
  expect(record.warcContentLength).toBe(0);

  expect(record.httpHeaders).toBeNull();

  expect(await record.contentText()).toBe("");

  expect(record.payload).toEqual(new Uint8Array([]));

  expect(decoder.decode(await WARCSerializer.serialize(record))).toBe(input);
});

test("Load revisit, with http headers", async () => {
  const input =
    "\
WARC/1.0\r\n\
WARC-Type: revisit\r\n\
WARC-Record-ID: <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
WARC-Target-URI: http://example.com/\r\n\
WARC-Date: 2000-01-01T00:00:00Z\r\n\
WARC-Profile: http://netpreserve.org/warc/1.0/revisit/identical-payload-digest\r\n\
WARC-Refers-To-Target-URI: http://example.com/foo\r\n\
WARC-Refers-To-Date: 1999-01-01T00:00:00Z\r\n\
WARC-Payload-Digest: sha1:B6QJ6BNJ3R4B23XXMRKZKHLPGJY2VE4O\r\n\
WARC-Block-Digest: sha1:3I42H3S6NNFQ2MSVX7XZKYAYSCX5QBYJ\r\n\
Content-Type: application/http; msgtype=response\r\n\
Content-Length: 54\r\n\
\r\n\
HTTP/1.1 200 OK\r\n\
Content-Type: text/html\r\n\
Foo: Bar\r\n\
\r\n\
\r\n\
\r\n\
";

  const parser = new WARCParser(getReadableStream([input]), {
    keepHeadersCase: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  const record = (await parser.parse())!;
  expect(record).not.toBeNull();
  expect(record.warcHeaders.protocol).toBe("WARC/1.0");
  expect(record.warcHeader("WARC-Record-ID")).toBe(
    "<urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>"
  );
  expect(record.warcType).toBe("revisit");
  expect(record.warcTargetURI).toBe("http://example.com/");
  expect(record.warcDate).toBe("2000-01-01T00:00:00Z");
  expect(record.warcRefersToTargetURI).toBe("http://example.com/foo");
  expect(record.warcRefersToDate).toBe("1999-01-01T00:00:00Z");
  expect(record.warcPayloadDigest).toBe(
    "sha1:B6QJ6BNJ3R4B23XXMRKZKHLPGJY2VE4O"
  );
  expect(record.warcContentType).toBe("application/http; msgtype=response");
  expect(record.warcContentLength).toBe(54);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  const httpHeaders = record.httpHeaders!;
  expect(httpHeaders).not.toBeNull();
  expect(httpHeaders.protocol).toBe("HTTP/1.1");
  expect(httpHeaders.statusCode).toBe(200);
  expect(httpHeaders.statusText).toBe("OK");

  expect(httpHeaders.headers.get("Foo")).toBe("Bar");
  expect(httpHeaders.headers.get("Content-Type")).toBe("text/html");

  expect(await record.contentText()).toBe("");

  expect(record.payload).toEqual(new Uint8Array([]));

  expect(decoder.decode(await WARCSerializer.serialize(record))).toEqual(input);
});

test("Load revisit, with http headers + chunk encoding", async () => {
  const input =
    "\
WARC/1.0\r\n\
WARC-Type: revisit\r\n\
WARC-Record-ID: <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
WARC-Target-URI: http://example.com/\r\n\
WARC-Date: 2000-01-01T00:00:00Z\r\n\
WARC-Profile: http://netpreserve.org/warc/1.0/revisit/identical-payload-digest\r\n\
WARC-Refers-To-Target-URI: http://example.com/foo\r\n\
WARC-Refers-To-Date: 1999-01-01T00:00:00Z\r\n\
WARC-Payload-Digest: sha1:B6QJ6BNJ3R4B23XXMRKZKHLPGJY2VE4O\r\n\
WARC-Block-Digest: sha1:3I42H3S6NNFQ2MSVX7XZKYAYSCX5QBYJ\r\n\
Content-Type: application/http; msgtype=response\r\n\
Content-Length: 82\r\n\
\r\n\
HTTP/1.1 200 OK\r\n\
Content-Type: text/html\r\n\
Transfer-Encoding: chunked\r\n\
Foo: Bar\r\n\
\r\n\
\r\n\
\r\n\
";

  const parser = new WARCParser(getReadableStream([input]), {
    keepHeadersCase: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  const record = (await parser.parse())!;
  expect(record).not.toBeNull();

  await record.readFully(true);

  expect(record.warcHeaders.protocol).toBe("WARC/1.0");
  expect(record.warcHeader("WARC-Record-ID")).toBe(
    "<urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>"
  );
  expect(record.warcType).toBe("revisit");
  expect(record.warcContentLength).toBe(82);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  const httpHeaders = record.httpHeaders!;
  expect(httpHeaders).not.toBeNull();
  expect(httpHeaders.protocol).toBe("HTTP/1.1");
  expect(httpHeaders.statusCode).toBe(200);
  expect(httpHeaders.statusText).toBe("OK");

  expect(httpHeaders.headers.get("Foo")).toBe("Bar");
  expect(httpHeaders.headers.get("Content-Type")).toBe("text/html");

  expect(record.payload).toEqual(new Uint8Array([]));

  expect(decoder.decode(await WARCSerializer.serialize(record))).toBe(input);
});

test("No parse http, record headers only", async () => {
  const input =
    "\
WARC/1.0\r\n\
WARC-Type: response\r\n\
WARC-Record-ID: <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
WARC-Target-URI: http://example.com/\r\n\
WARC-Date: 2000-01-01T00:00:00Z\r\n\
WARC-Payload-Digest: sha1:B6QJ6BNJ3R4B23XXMRKZKHLPGJY2VE4O\r\n\
WARC-Block-Digest: sha1:KMUABC6URWIQ7QXCZDQ5FS6WIBBFRORR\r\n\
Content-Type: application/http; msgtype=response\r\n\
Content-Length: 268\r\n\
\r\n\
HTTP/1.0 200 OK\r\n\
Content-Type: text/plain; charset=\"UTF-8\"\r\n\
Content-Disposition: attachment; filename*=UTF-8''%D0%B8%D1%81%D0%BF%D1%8B%D1%82%D0%B0%D0%BD%D0%B8%D0%B5.txt\r\n\
Custom-Header: somevalue\r\n\
Unicode-Header: %F0%9F%93%81%20text%20%F0%9F%97%84%EF%B8%8F\r\n\
\r\n\
more\n\
text\r\n\
\r\n\
";

  const parser = new WARCParser(getReader([input]), { parseHttp: false });

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  const record = (await parser.parse())!;
  expect(record).not.toBeNull();

  expect(record.warcHeaders.protocol).toBe("WARC/1.0");
  expect(record.warcContentLength).toBe(268);
  expect(record.warcHeaders).not.toBeNull();
  expect(record.httpHeaders).toBe(null);

  expect(record.getResponseInfo()).toBe(null);

  const statusline = "HTTP/1.0 200 OK\r\n";
  expect(record.reader).toBeInstanceOf(LimitReader);
  expect(await (record.reader as LimitReader).readline()).toBe(statusline);

  for await (const chunk of record) {
    expect(chunk.length).toBe(268 - statusline.length);
  }

  // check headers case
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  const record2 = (await WARCParser.parse(getReader([input]), {
    keepHeadersCase: true,
  }))!;
  expect(record2).not.toBeNull();
  expect(record2.warcHeaders.protocol).toBe("WARC/1.0");
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  const httpHeaders = record2.httpHeaders!;
  expect(httpHeaders).not.toBeNull();
  expect(input.indexOf(httpHeaders.toString())).toBeGreaterThan(0);

  // serialize
  const buff = await WARCSerializer.serialize(record2);
  expect(decoder.decode(buff)).toBe(input);
});

test("warc1.1 response and request, status checks", async () => {
  const input = fs.readFileSync(
    get_warc_path("data/redirect.warc"),
    "utf-8"
  );

  let parser = new WARCParser(getReader([input]));
  let response: WARCRecord | null = null;

  for await (response of parser) {
    break;
  }

  expect(response).not.toBeNull();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  expect(response!.warcHeaders.protocol).toBe("WARC/1.1");

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  const responseHttpHeaders = response!.httpHeaders!;
  expect(responseHttpHeaders).not.toBeNull();
  expect(responseHttpHeaders.protocol).toBe("HTTP/1.1");
  expect(responseHttpHeaders.statusCode).toBe(301);
  expect(responseHttpHeaders.statusText).toBe("Moved Permanently");

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  expect(response!.warcDate).toBe("2020-04-12T18:42:50.696509Z");

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  let request = (await parser.parse())!;
  expect(request).not.toBeNull();

  expect(request.warcHeaders.protocol).toBe("WARC/1.1");

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  const requestHttpHeaders = request.httpHeaders!;
  expect(requestHttpHeaders).not.toBeNull();
  expect(requestHttpHeaders.method).toBe("GET");
  expect(requestHttpHeaders.requestPath).toBe("/domains/example");
  expect(request.warcDate).toBe("2020-04-12T18:42:50.696509Z");

  // read again, access in different order
  parser = new WARCParser(getReader([input]));

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  response = (await parser.parse())!;
  expect(response).not.toBeNull();

  // incorrect accessor, just return protocol
  expect(response.warcHeaders.method).toBe("WARC/1.1");

  expect(response?.httpHeaders?.statusText).toBe("Moved Permanently");
  expect(response?.httpHeaders?.protocol).toBe("HTTP/1.1");

  expect(response.getResponseInfo()).not.toBeNull();

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  const responseInfo = response.getResponseInfo()!;
  expect(responseInfo).not.toBeNull();
  const { status, statusText, headers } = responseInfo;
  expect(status).toBe(301);
  expect(statusText).toBe("Moved Permanently");
  expect(headers).toBe(response?.httpHeaders?.headers);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  request = (await parser.parse())!;
  expect(request).not.toBeNull();
  expect(request?.httpHeaders?.requestPath).toBe("/domains/example");
  expect(request?.httpHeaders?.method).toBe("GET");
});

test("warc1.1 serialize records match", async () => {
  const input = fs.readFileSync(
    get_warc_path("data/redirect.warc"),
    "utf-8"
  );

  const serialized = [];
  let size = 0;

  for await (const record of WARCParser.iterRecords(getReader([input]), {
    keepHeadersCase: true,
  })) {
    const chunk = await WARCSerializer.serialize(record);
    serialized.push(chunk);
    size += chunk.length;
  }

  expect(decoder.decode(concatChunks(serialized, size))).toBe(input);
});

test("chunked warc read", async () => {
  const input = fs.createReadStream(
    get_warc_path("data/example-iana.org-chunked.warc")
  );

  const parser = new WARCParser(input);

  await parser.parse();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  const record = (await parser.parse())!;

  expect(record).not.toBeNull();
  expect(record.warcType).toBe("response");

  expect(await record.readline()).toBe("<!doctype html>\n");

  // can't read raw data anymore
  await expect(async () => await record.readFully(false)).rejects.toThrow(
    "WARC Record decoding already started, but requesting raw payload"
  );

  const text = await record.contentText();

  expect(text.split("\n")[0]).toBe("<html>");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- checking invalid type
  const busyRecord = record as any as { reader: LimitReader };
  await expect(async () => await busyRecord.reader.readFully()).rejects.toThrow(
    "WARC Record decoding already started, but requesting raw payload"
  );

  expect(await record.readFully(true)).not.toBeNull();
});

test("no await catch errors", async () => {
  const input = fs.createReadStream(
    get_warc_path("data/example-iana.org-chunked.warc")
  );

  const parser = new WARCParser(input);

  async function* readLines(record: WARCRecord) {
    for await (const chunk of record) {
      yield chunk;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  const record0 = (await parser.parse())!;
  expect(record0).not.toBeNull();
  const iter = readLines(record0);
  await iter.next();

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked in expect
  const record1 = (await parser.parse())!;
  expect(record1).not.toBeNull();
  await expect(async () => await iter.next()).rejects.toThrow(
    "Record already consumed.. Perhaps a promise was not awaited?"
  );
  await expect(async () => await record0.readline()).rejects.toThrow(
    "Record already consumed.. Perhaps a promise was not awaited?"
  );

  let count = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const chunk of record1) {
    count++;
  }
  expect(count).toBeGreaterThan(0);
  expect(record1.consumed).not.toBeNull();

  count = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const chunk of record1) {
    count++;
  }
  expect(count).toBe(0);
});
