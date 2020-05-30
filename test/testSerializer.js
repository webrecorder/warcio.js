"use strict";

import test from 'ava';
import fetch from 'node-fetch';

import './utils';

import { WARCRecord, WARCParser, AsyncIterReader, StatusAndHeaders, WARCSerializer } from '../main';


const decoder = new TextDecoder("utf-8");
const encoder = new TextEncoder("utf-8");

async function* iter(data) {
  yield encoder.encode(data);
}


let swarc = "";



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

  const res = await WARCSerializer.serialize(record);

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

  const res = decoder.decode(await WARCSerializer.serialize(record));

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



