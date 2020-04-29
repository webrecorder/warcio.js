"use strict";

import test from 'ava';
import fetch from 'node-fetch';

import './utils';

import { WARCParser, AsyncIterReader, StatusAndHeaders } from '../main';
import { SWARCParser, WARCRecordStreamer } from '../src/serializer';


const decoder = new TextDecoder("utf-8");
const encoder = new TextEncoder("utf-8");


let swarc = "";

async function* iter(data) {
  yield encoder.encode(data);
}




test('compute streaming digest', async t => {
  const input = `\
WARC/1.0\r\n\
WARC-Type: response\r\n\
WARC-Record-ID: <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
WARC-Target-URI: http://example.com/\r\n\
WARC-Date: 2000-01-01T00:00:00Z\r\n\
Content-Type: application/http; msgtype=response\r\n\
\r\n\
HTTP/1.0 200 OK\r\n\
Content-Type: text/plain; charset="UTF-8"\r\n\
Custom-Header: somevalue\r\n\
\r\n\
some\n\
text`;

  async function* iter() {
    yield encoder.encode(input);
  }

  const record = await WARCParser.parse(iter(), {keepHeadersCase: true});
  t.is(record.warcType, "response");

  const streamer = new WARCRecordStreamer(record);
  const res = decoder.decode(await streamer.readFully());

  const expected = `\
SWARC/1.0\r\n\
WARC-Type: response\r\n\
WARC-Record-ID: <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
WARC-Target-URI: http://example.com/\r\n\
WARC-Date: 2000-01-01T00:00:00Z\r\n\
Content-Type: application/http; msgtype=response\r\n\
\r\n\
HTTP/1.0 200 OK\r\n\
Content-Type: text/plain; charset="UTF-8"\r\n\
Custom-Header: somevalue\r\n\
\r\n\
9\r\n\
some\n\
text\r\n\
0\r\n\
\r\n\
TWARC/1.0\r\n\
WARC-Payload-Digest: sha1:B6QJ6BNJ3R4B23XXMRKZKHLPGJY2VE4O\r\n\
WARC-Block-Digest: sha1:OS3OKGCWQIJOAOC3PKXQOQFD52NECQ74\r\n\
Content-Length: 97\r\n\r\n\r\n`;

  t.is(res, expected);

});


test('compute streaming, create new record', async t => {

  const url = "http://example.com/";
  const date = "2000-01-01T00:00:00Z";
  const type = "response";

  const warcHeaders = {"WARC-Record-ID": " <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>"};

  const status = 200;
  const statusText = "OK";
  const headers = {"Content-Type": 'text/plain; charset="UTF-8"',
                   "Custom-Header": "somevalue"};

  const record = WARCParser.create({url, date, type, warcHeaders, headers, status, statusText}, iter("some\ntext"));

  const streamer = new WARCRecordStreamer(record);
  const res = decoder.decode(await streamer.readFully());

  const expected = `\
SWARC/1.0\r\n\
warc-date: 2000-01-01T00:00:00Z\r\n\
warc-record-id:  <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
warc-target-uri: http://example.com/\r\n\
warc-type: response\r\n\
content-type: application/http; msgtype=response\r\n\
\r\n\
HTTP/1.1 200 OK\r\n\
content-type: text/plain; charset="UTF-8"\r\n\
custom-header: somevalue\r\n\
\r\n\
9\r\n\
some\ntext\r\n\
0\r\n\
\r\n\
TWARC/1.0\r\n\
WARC-Payload-Digest: sha1:B6QJ6BNJ3R4B23XXMRKZKHLPGJY2VE4O\r\n\
WARC-Block-Digest: sha1:7WTS6FSLT7MT4BF5JXXB7WJLOP2XTKOS\r\n\
Content-Length: 97\r\n\
\r\n\
\r\n`

  t.is(res, expected);

  swarc = expected;
});


test('test swarc parser', async t => {

  const reader = new AsyncIterReader(iter(swarc));

  const record2 = await new SWARCParser(reader).parse();

  const full = await record2.readFully();

  t.is(decoder.decode(full), 'some\ntext');

  t.is(record2.warcHeaders.toString(), `\
WARC/1.0\r\n\
content-length: 97\r\n\
warc-block-digest: sha1:7WTS6FSLT7MT4BF5JXXB7WJLOP2XTKOS\r\n\
warc-payload-digest: sha1:B6QJ6BNJ3R4B23XXMRKZKHLPGJY2VE4O\r\n\
content-type: application/http; msgtype=response\r\n\
warc-date: 2000-01-01T00:00:00Z\r\n\
warc-record-id: <urn:uuid:12345678-feb0-11e6-8f83-68a86d1772ce>\r\n\
warc-target-uri: http://example.com/\r\n\
warc-type: response\r\n`);
 

});
