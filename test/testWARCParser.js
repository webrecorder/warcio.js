"use strict";

import test from 'ava';

import { StatusAndHeadersParser, StreamReader, WARCParser } from '../index';
import { getReader } from './utils';


const decoder = new TextDecoder("utf-8");


// ===========================================================================
// StatusAndHeaders parsing utils
async function readSH(t, input, expected) {
  const parser = new StatusAndHeadersParser();
  const result = await parser.parse(new StreamReader(getReader([input])));

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
  const result = await parser.parse(new StreamReader(getReader(['\r\n\r\n'])));

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

  const parser = new WARCParser();

  const stream = new StreamReader(getReader([input]));

  const record0 = await parser.parse(stream);

  t.is(record0.warcType, "warcinfo");

  const warcinfo = decoder.decode(await record0.readFully());

  t.is(warcinfo, `\
software: recorder test\r\n\
format: WARC File Format 1.0\r\n\
json-metadata: {"foo": "bar"}\r\n\
`);

  const record = await parser.parse(stream);

  t.is(record.warcTargetURI, "http://example.com/");

  t.is(decoder.decode(await record.readFully()), "some\ntext");

  const record2 = await parser.parse(stream);

  t.is(decoder.decode(await record2.readFully()), "more\ntext");

  t.is(await parser.parse(stream), null);

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

  const parser = new WARCParser();

  //const stream = new StreamReader(getReader([input]));

  const record = await parser.parse(getReader([input]));

  t.is(record.warcHeader('warc-record-id'), '<urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>');
  t.is(record.warcType, "revisit");
  t.is(record.warcTargetURI, 'http://example.com/');
  t.is(record.warcDate, '2000-01-01T00:00:00Z');
  t.is(record.warcRefersToTargetURI, 'http://example.com/foo');
  t.is(record.warcRefersToDate, '1999-01-01T00:00:00Z');
  t.is(record.warcPayloadDigest, 'sha1:B6QJ6BNJ3R4B23XXMRKZKHLPGJY2VE4O');
  t.is(record.warcContentType, 'application/http; msgtype=response');
  t.is(record.warcContentLength, 0);

  t.is(record.httpHeaders, null);

});
