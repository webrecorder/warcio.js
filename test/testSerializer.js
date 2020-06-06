"use strict";

import test from 'ava';
import fetch from 'node-fetch';

import './utils';

import { WARCRecord, WARCParser, AsyncIterReader, StatusAndHeaders, WARCSerializer } from '../main';

import { inflate } from 'pako';

const decoder = new TextDecoder("utf-8");
const encoder = new TextEncoder("utf-8");

async function* iter(data) {
  yield encoder.encode(data);
}


test('compute digest, buffering', async t => {
  const input = `\
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
text\r\n\r\n`;

  const record = await WARCParser.parse(iter(input), {keepHeadersCase: true});
  t.is(record.warcType, "response");

  const res = await WARCSerializer.serialize(record, {digest: {algo: 'sha-1', prefix: "sha1:", base32: true}});

  t.is(decoder.decode(res), `\
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
text\r\n\r\n`);

});


test('compute digest, create record', async t => {

  async function* reader() {
    yield encoder.encode('so');
    yield encoder.encode('me\n');
    yield encoder.encode('text');
  }

  const url = "http://example.com/";
  const date = "2000-01-01T00:00:00Z";
  const type = "response";
  const warcHeaders = {"WARC-Record-ID": "<urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>"};
  const headers = {
      "Custom-Header": "somevalue",
      "Content-Type": 'text/plain; charset="UTF-8"'
  };

  const keepHeadersCase = true;

  const record = await WARCRecord.create({
      url, date, type, warcHeaders, headers, keepHeadersCase}, reader());

  t.is(record.warcType, "response");

  const res = decoder.decode(await WARCSerializer.serialize(record, {digest: {algo: 'sha-1', prefix: "sha1:", base32: true}}));

  t.is(res, `\
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
text\r\n\r\n`);

});



test('compute digest, create record, gzipped', async t => {

  async function* reader() {
    yield encoder.encode('so');
    yield encoder.encode('me\n');
    yield encoder.encode('text');
  }

  const url = "http://example.com/";
  const date = "2000-01-01T00:00:00Z";
  const type = "response";
  const warcHeaders = {"WARC-Record-ID": "<urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>"};
  const headers = {
      "Custom-Header": "somevalue",
      "Content-Type": 'text/plain; charset="UTF-8"'
  };

  const keepHeadersCase = true;

  const record = await WARCRecord.create({
      url, date, type, warcHeaders, headers, keepHeadersCase}, reader());

  t.is(record.warcType, "response");

  const gzipped = await WARCSerializer.serialize(record, {gzip: true});
  const res = decoder.decode(inflate(gzipped));

  t.is(res, `\
WARC/1.0\r\n\
WARC-Record-ID: <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
WARC-Target-URI: http://example.com/\r\n\
WARC-Date: 2000-01-01T00:00:00Z\r\n\
WARC-Type: response\r\n\
Content-Type: application/http; msgtype=response\r\n\
WARC-Payload-Digest: sha-256:e8e5bf447c352c0080e1444994b0cc1fbe7a25f3ea637c5c89f595b6a95c9253\r\n\
WARC-Block-Digest: sha-256:e482022d39cd75c9dda382678f9122864883d22359d4f64804cb0c263fe8065f\r\n\
Content-Length: 97\r\n\
\r\n\
HTTP/1.1 200 OK\r\n\
Custom-Header: somevalue\r\n\
Content-Type: text/plain; charset="UTF-8"\r\n\
\r\n\
some\n\
text\r\n\r\n`);

});


test('create warcinfo', async t => {
  const filename = "/my/web/archive.warc";
  const type = "warcinfo";
  const date = "2020-06-06T07:07:04.923Z";

  const fields = {
    "software": "warcio.js test",
    "format": "WARC File Format 1.1",
    "creator": "test-case",
    "isPartOf": "test"
  }

  const warcHeaders = {
    'WARC-Record-ID': '<urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>',
  };

  const warcVersion = "WARC/1.1";

  const record = await WARCRecord.createWARCInfo({
      filename, warcHeaders, date, type, warcVersion}, fields);

  const res = decoder.decode(await WARCSerializer.serialize(record));

  t.is(res, `\
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
`);

});


test('create revisit', async t => {
  const url = "https://example.com/another/file.html";
  const type = "revisit";
  const date = "2020-06-06T07:07:04.923Z";
  const refersToDate = "2020-12-26T07:07:04.12";
  const refersToUrl = "https://example.com/";

  const warcHeaders = {
    'WARC-Payload-Digest': 'sha-256:e8e5bf447c352c0080e1444994b0cc1fbe7a25f3ea637c5c89f595b6a95c9253',
    'WARC-Record-ID': '<urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>'
  }

  const record = await WARCRecord.create({
      url, date, type, warcHeaders, refersToUrl, refersToDate}, iter(''));

  const res = decoder.decode(await WARCSerializer.serialize(record));

  t.is(res, `\
WARC/1.0\r\n\
WARC-Payload-Digest: sha-256:e8e5bf447c352c0080e1444994b0cc1fbe7a25f3ea637c5c89f595b6a95c9253\r\n\
WARC-Record-ID: <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
WARC-Target-URI: https://example.com/another/file.html\r\n\
WARC-Date: 2020-06-06T07:07:04Z\r\n\
WARC-Type: revisit\r\n\
WARC-Profile: http://netpreserve.org/warc/1.0/revisit/identical-payload-digest\r\n\
WARC-Refers-To-Target-URI: https://example.com/\r\n\
WARC-Refers-To-Date: 2020-12-26T07:07:04Z\r\n\
Content-Type: application/http; msgtype=response\r\n\
Content-Length: 19\r\n\
\r\n\
HTTP/1.1 200 OK\r\n\
\r\n\
\r\n\
\r\n`);

});
