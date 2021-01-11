"use strict";

import test from 'ava';

import { getReadableStream, getReader } from './utils';

import { StatusAndHeadersParser, AsyncIterReader, WARCParser, WARCSerializer } from '../main';

const decoder = new TextDecoder("utf-8");


// ===========================================================================
// StatusAndHeaders parsing utils
async function readSH(t, input, expected) {
  const parser = new StatusAndHeadersParser();
  const result = await parser.parse(new AsyncIterReader(getReader([input])));

  t.deepEqual(result.toString(), expected);
}


// ===========================================================================
// ===========================================================================
// Tests
test('StatusAndHeaders test 1', readSH,
  `\
HTTP/1.0 200 OK\r\n\
Content-Type: ABC\r\n\
HTTP/1.0 200 OK\r\n\
Some: Value\r\n\
Multi-Line: Value1\r\n\
    Also This\r\n\
\r\n\
Body`,

  `\
HTTP/1.0 200 OK\r
Content-Type: ABC\r
Some: Value\r
Multi-Line: Value1    Also This\r
`);

test('StatusAndHeaders test 2', readSH,
  `\
HTTP/1.0 204 Empty\r\n\
Content-Type: Value\r\n\
%Invalid%\r\n\
\tMultiline\r\n\
Content-Length: 0\r\n\
Bad: multi\nline\r\n\
\r\n`,

  `HTTP/1.0 204 Empty\r
Content-Type: Value\r
Content-Length: 0\r
Bad: multi\r
`);


test('StatusAndHeaders test empty', async t => {
  const parser = new StatusAndHeadersParser();
  const result = await parser.parse(new AsyncIterReader(getReader(['\r\n\r\n'])));

  t.is(result, null);
});


test('Load WARC Records', async t => {
  const input = `\
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
`

  let reader = new AsyncIterReader(getReader([input]));

  let parser = new WARCParser(reader);

  const record0 = await parser.parse();

  t.is(record0.warcType, "warcinfo");

  //const warcinfo = decoder.decode(await record0.readFully());

  let warcinfo = "";

  for await (const line of record0.iterLines()) {
    warcinfo += line;
  }

  t.is(warcinfo, `\
software: recorder test\r\n\
format: WARC File Format 1.0\r\n\
json-metadata: {"foo": "bar"}\r\n\
`);

  const record = await parser.parse();

  t.is(record.warcTargetURI, "http://example.com/");

  t.is(decoder.decode(await record.readFully()), "some\ntext");

  const record2 = await parser.parse();

  t.is(decoder.decode(await record2.readFully()), "more\ntext");

  t.is(await parser.parse(), null);

  // reread payload
  t.is(await record.contentText(), "some\ntext");

  // iterate should return null
  let count = 0;
  for await (const chunk of record) {
    count++;
  }
  t.is(count, 0);


  // reread via getReadableStream
  parser = new WARCParser(getReader([input]));
  const record3 = await parser.parse();
  const record4 = await parser.parse();
  const reader2 = new AsyncIterReader(record4.getReadableStream().getReader());
  t.is(decoder.decode(await reader2.readFully()), "some\ntext");

  // test iterRecords
  for await (const arecord of WARCParser.iterRecords(getReader([input]))) {
    t.not(arecord.warcType, null);
  }

});


test('Load revisit 1', async t => {
  const input = `\
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
`;

  const parser = new WARCParser(getReadableStream([input]), {keepHeadersCase: true});

  const record = await parser.parse();

  t.is(record.warcHeaders.protocol, "WARC/1.0");
  t.is(record.warcHeader('WARC-Record-ID'), '<urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>');
  t.is(record.warcType, "revisit");
  t.is(record.warcTargetURI, 'http://example.com/');
  t.is(record.warcDate, '2000-01-01T00:00:00Z');
  t.is(record.warcRefersToTargetURI, 'http://example.com/foo');
  t.is(record.warcRefersToDate, '1999-01-01T00:00:00Z');
  t.is(record.warcPayloadDigest, 'sha1:B6QJ6BNJ3R4B23XXMRKZKHLPGJY2VE4O');
  t.is(record.warcContentType, 'application/http; msgtype=response');
  t.is(record.warcContentLength, 0);

  t.is(record.httpHeaders, null);

  t.is(await record.contentText(), "");

  t.deepEqual(record.payload, new Uint8Array([]));

  t.is(decoder.decode(await WARCSerializer.serialize(record)), input);
});



test('No parse http, record headers only', async t => {
  const input = `\
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
`

  const parser = new WARCParser(getReader([input]), {parseHttp: false});
  
  const record = await parser.parse();

  t.is(record.warcHeaders.protocol, "WARC/1.0");
  t.is(record.warcContentLength, 268);
  t.not(record.warcHeaders, null);
  t.is(record.httpHeaders, null);

  t.is(record.getResponseInfo(), null);

  const statusline = "HTTP/1.0 200 OK\r\n";
  t.is(await record.reader.readline(), statusline)

  for await (const chunk of record) {
    t.is(chunk.length, 268 - statusline.length);
  }

  // check headers case
  const record2 = await WARCParser.parse(getReader([input]), {keepHeadersCase: true});
  t.is(record2.warcHeaders.protocol, "WARC/1.0");
  t.true(input.indexOf(record2.httpHeaders.toString()) > 0);

  // serialize
  const buff = await WARCSerializer.serialize(record2);
  t.is(decoder.decode(buff), input);

});


test('warc1.1 response and request, status checks', async t => {
  const fs = require('fs');
  const path = require('path');
  const input = fs.readFileSync(path.join(__dirname, 'data', 'redirect.warc'), 'utf-8')

  let parser = new WARCParser(getReader([input]));
  let response;

  for await (response of parser) {
    break;
  }

  t.is(response.warcHeaders.protocol, "WARC/1.1");

  t.is(response.httpHeaders.protocol, "HTTP/1.1");
  t.is(response.httpHeaders.statusCode, 301);
  t.is(response.httpHeaders.statusText, "Moved Permanently");

  t.is(response.warcDate, "2020-04-12T18:42:50.696509Z");

  let request = await parser.parse();

  t.is(request.warcHeaders.protocol, "WARC/1.1");

  t.is(request.httpHeaders.method, "GET");
  t.is(request.httpHeaders.requestPath, "/domains/example");
  t.is(request.warcDate, "2020-04-12T18:42:50.696509Z");

  // read again, access in different order
  parser = new WARCParser(getReader([input]));

  response = await parser.parse();

  // incorrect accessor, just return protocol
  t.is(response.warcHeaders.method, "WARC/1.1");

  t.is(response.httpHeaders.statusText, "Moved Permanently");
  t.is(response.httpHeaders.protocol, "HTTP/1.1");

  t.not(response.getResponseInfo(), null);

  const {status, statusText, headers} = response.getResponseInfo();
  t.is(status, 301);
  t.is(statusText, "Moved Permanently");
  t.is(headers, response.httpHeaders.headers);

  request = await parser.parse();
  t.is(request.httpHeaders.requestPath, "/domains/example");
  t.is(request.httpHeaders.method, "GET");

});


test('warc1.1 serialize records match', async t => {
  const fs = require('fs');
  const path = require('path');
  const input = fs.readFileSync(path.join(__dirname, 'data', 'redirect.warc'), 'utf-8')

  const serialized = [];
  let size = 0;

  const encoder = new TextEncoder("utf-8");

  for await (const record of WARCParser.iterRecords(getReader([input]), {keepHeadersCase: true})) {
    const chunk = await WARCSerializer.serialize(record, encoder);
    serialized.push(chunk);
    size += chunk.length;
  }

  t.is(decoder.decode(AsyncIterReader.concatChunks(serialized, size)), input);

});


test('chunked warc read', async t => {
  const fs = require('fs');
  const path = require('path');
  const input = fs.createReadStream(path.join(__dirname, 'data', 'example-iana.org-chunked.warc'));

  const parser = new WARCParser(input);

  await parser.parse();
  const record = await parser.parse();

  t.is(record.warcType, "response");

  t.is(await record.readline(), "<!doctype html>\n");

  // can't read raw data anymore
  await t.throwsAsync(async () => await record.readFully(false), {"message": "WARC Record decoding already started, but requesting raw payload"});

  const text = await record.contentText();

  t.is(text.split("\n")[0], "<html>");

  await t.throwsAsync(async () => await record.reader.readFully(false), {"message": "WARC Record decoding already started, but requesting raw payload"});

  t.not(await record.readFully(true), null);

}); 

test('no await catch errors', async t => {
  const fs = require('fs');
  const path = require('path');
  const input = fs.createReadStream(path.join(__dirname, 'data', 'example-iana.org-chunked.warc'));

  const parser = new WARCParser(input);

  async function* readLines(record) {
    for await (const chunk of record) {
      yield chunk;
    }
  }

  const record0 = await parser.parse();
  const iter = readLines(record0);
  await iter.next();

  const record1 = await parser.parse();
  await t.throwsAsync(async () => await iter.next(), {"message": "Record already consumed.. Perhaps a promise was not awaited?"});
  await t.throwsAsync(async () => await record0.readline(), {"message": "Record already consumed.. Perhaps a promise was not awaited?"});

  let count = 0;
  for await (const chunk of record1) {
    count++;
  }
  t.true(count > 0);
  t.not(record1.consumed, null);

  count = 0;
  for await (const chunk of record1) {
    count++;
  }
  t.true(count === 0);
 

});




