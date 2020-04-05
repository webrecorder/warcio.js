"use strict";

import test from 'ava';

import { main } from '../indexer';

import { WritableStreamBuffer } from 'stream-buffers';

async function index(t, params, expected) {
  const buff = new WritableStreamBuffer();

  await main(params, buff);

  t.is(buff.getContentsAsString('utf-8'), expected);
}


test('index default fields warc.gz', index, 
  ['./test/data/example.warc.gz'],
  `\
{"offset":0,"warc-type":"warcinfo"}
{"offset":353,"warc-type":"warcinfo"}
{"offset":784,"warc-type":"response","warc-target-uri":"http://example.com/"}
{"offset":2012,"warc-type":"request","warc-target-uri":"http://example.com/"}
{"offset":2621,"warc-type":"revisit","warc-target-uri":"http://example.com/"}
{"offset":3207,"warc-type":"request","warc-target-uri":"http://example.com/"}
`);


test('index custom fields warc', index,
  ['./test/data/example.warc', '--fields', 'offset,length,warc-type,http:status,http:content-type'],
  `\
{"offset":0,"length":484,"warc-type":"warcinfo"}
{"offset":484,"length":705,"warc-type":"warcinfo"}
{"offset":1189,"length":1365,"warc-type":"response","http:status":200,"http:content-type":"text/html"}
{"offset":2554,"length":800,"warc-type":"request"}
{"offset":3354,"length":942,"warc-type":"revisit","http:status":200,"http:content-type":"text/html"}
{"offset":4296,"length":800,"warc-type":"request"}
`);



test('index wget', index,
  ['./test/data/example-wget-bad-target-uri.warc.gz'],
  `\
{"offset":0,"warc-type":"warcinfo"}
{"offset":410,"warc-type":"request","warc-target-uri":"http://example.com/"}
{"offset":824,"warc-type":"response","warc-target-uri":"http://example.com/"}
{"offset":1978,"warc-type":"metadata","warc-target-uri":"metadata://gnu.org/software/wget/warc/MANIFEST.txt"}
{"offset":2295,"warc-type":"resource","warc-target-uri":"metadata://gnu.org/software/wget/warc/wget_arguments.txt"}
{"offset":2681,"warc-type":"resource","warc-target-uri":"metadata://gnu.org/software/wget/warc/wget.log"}
`);


