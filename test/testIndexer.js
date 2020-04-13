"use strict";

import test from 'ava';

import { main } from '../src/cli_main';

import { WritableStreamBuffer } from 'stream-buffers';

async function index(t, params, expected) {
  const buff = new WritableStreamBuffer();

  await main(params, buff);

  t.is(buff.getContentsAsString('utf-8'), expected);
}


test('index default fields warc.gz', index, 
  ['index', './test/data/example.warc.gz'],
  `\
{"offset":0,"warc-type":"warcinfo"}
{"offset":353,"warc-type":"warcinfo"}
{"offset":784,"warc-type":"response","warc-target-uri":"http://example.com/"}
{"offset":2012,"warc-type":"request","warc-target-uri":"http://example.com/"}
{"offset":2621,"warc-type":"revisit","warc-target-uri":"http://example.com/"}
{"offset":3207,"warc-type":"request","warc-target-uri":"http://example.com/"}
`);


test('index custom fields warc', index,
  ['index', './test/data/example.warc', '--fields', 'offset,length,warc-type,http:status,http:content-type'],
  `\
{"offset":0,"length":484,"warc-type":"warcinfo"}
{"offset":488,"length":705,"warc-type":"warcinfo"}
{"offset":1197,"length":1365,"warc-type":"response","http:status":200,"http:content-type":"text/html"}
{"offset":2566,"length":800,"warc-type":"request"}
{"offset":3370,"length":942,"warc-type":"revisit","http:status":200,"http:content-type":"text/html"}
{"offset":4316,"length":800,"warc-type":"request"}
`);



test('index wget', index,
  ['index', './test/data/example-wget-bad-target-uri.warc.gz', '--fields', 'offset,length,warc-type,warc-target-uri'],
  `\
{"offset":0,"length":410,"warc-type":"warcinfo"}
{"offset":410,"length":414,"warc-type":"request","warc-target-uri":"http://example.com/"}
{"offset":824,"length":1154,"warc-type":"response","warc-target-uri":"http://example.com/"}
{"offset":1978,"length":317,"warc-type":"metadata","warc-target-uri":"metadata://gnu.org/software/wget/warc/MANIFEST.txt"}
{"offset":2295,"length":386,"warc-type":"resource","warc-target-uri":"metadata://gnu.org/software/wget/warc/wget_arguments.txt"}
{"offset":2681,"length":586,"warc-type":"resource","warc-target-uri":"metadata://gnu.org/software/wget/warc/wget.log"}
`);


test('cdxj warc.gz', index,
  ['cdx-index', './test/data/example.warc.gz'],
  `\
com,example)/ 20170306040206 {"url":"http://example.com/","mime":"text/html","status":200,"digest":"G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK","length":1228,"offset":784,"filename":"example.warc.gz"}
com,example)/ 20170306040348 {"url":"http://example.com/","mime":"warc/revisit","status":200,"digest":"G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK","length":586,"offset":2621,"filename":"example.warc.gz"}
`);


test('cdx11 warc.gz', index,
  ['cdx-index', './test/data/example.warc.gz', '--format', 'cdx'],
  `\
com,example)/ 20170306040206 http://example.com/ text/html 200 G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK - - 1228 784 example.warc.gz
com,example)/ 20170306040348 http://example.com/ warc/revisit 200 G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK - - 586 2621 example.warc.gz
`);


test('cdx11 warc', index,
  ['cdx-index', './test/data/example.warc', '--format', 'cdx'],
  `\
com,example)/ 20170306040206 http://example.com/ text/html 200 G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK - - 1365 1197 example.warc
com,example)/ 20170306040348 http://example.com/ warc/revisit 200 G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK - - 942 3370 example.warc
`);


test('cdx json warc.gz all', index,
  ['cdx-index', './test/data/example.warc.gz', '--format', 'json', '--all'],
  `\
{"timestamp":"20170306040353","mime":"application/warc-fields","length":353,"offset":0,"filename":"example.warc.gz"}
{"timestamp":"20170306040353","mime":"application/warc-fields","length":431,"offset":353,"filename":"example.warc.gz"}
{"urlkey":"com,example)/","timestamp":"20170306040206","url":"http://example.com/","mime":"text/html","status":200,"digest":"G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK","length":1228,"offset":784,"filename":"example.warc.gz"}
{"urlkey":"com,example)/","timestamp":"20170306040206","url":"http://example.com/","digest":"3I42H3S6NNFQ2MSVX7XZKYAYSCX5QBYJ","length":609,"offset":2012,"filename":"example.warc.gz"}
{"urlkey":"com,example)/","timestamp":"20170306040348","url":"http://example.com/","mime":"warc/revisit","status":200,"digest":"G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK","length":586,"offset":2621,"filename":"example.warc.gz"}
{"urlkey":"com,example)/","timestamp":"20170306040348","url":"http://example.com/","digest":"3I42H3S6NNFQ2MSVX7XZKYAYSCX5QBYJ","length":609,"offset":3207,"filename":"example.warc.gz"}
`);

test('cdx resource', index,
  ['cdx-index', './test/data/example-resource.warc.gz'],
  `\
com,example,some:8080)/ 20200405201750 {"url":"http://some.example.com:8080/","mime":"text/plain","digest":"QEF4QP424P5IOPMURMAC4K6KNUTHXQW2","length":261,"offset":0,"filename":"example-resource.warc.gz"}
`);

test('skip dir', index,
  ['cdx-index', './'], false);
