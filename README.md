# warcio.js

Streaming web archive (WARC) file support for JS.

This package represents a rough port of the python [warcio](https://github.com/webrecorder/warcio) for JavaScript

The package is optimized for modern browsers as well as Node.

[![Build Status](https://travis-ci.com/ikreymer/warcio.js.svg?branch=master)](https://travis-ci.com/ikreymer/warcio.js)
[![codecov](https://codecov.io/gh/ikreymer/warcio.js/branch/master/graph/badge.svg)](https://codecov.io/gh/ikreymer/warcio.js)

## Browser Usage 

### Reading WARC Files

The package is designed to work with web streams, in particular [ReadableStream.getReader()](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/getReader)
to read WARC files incrementally.

Any gzip-compressed records are automatically decompressed using [pako](https://github.com/nodeca/pako) library.

The below example calls `response.body.getReader()` to access the stream:

```javascript
import { WARCParser } from 'warcio';

...

async function readWARC(url) {
  const response = await fetch(url);
  
  const parser = new WARCParser();

  for await (const record of parser.iterRecords(response.body)) {
    // ways to access warc data
    console.log(record.warcType);
    console.log(record.warcTargetURI);
    console.log(record.warcHeader('WARC-Target-URI'));
    console.log(record.warcHeaders.headers.get('WARC-Record-ID'));
  }
}

```
### Streaming WARCs in the Browser

A key property of `warcio.js` is to support streaming WARC records from a server via a ServiceWorker.

For example, the following could be used to load a WARC record, parse the HTTP headers, and return a streaming `Response` from a ServiceWorker.

The response continues reading from the upstream source.

```javascript
import { WARCParser } from 'warcio';

async function streamWARCRecord(url) {
  const response = await fetch(url);
 
  const parser = new WARCParser();
  
  // parse WARC record, which includes WARC headers and HTTP headers
  const record = await parser.parse(response.body);
  
  // get the response options for Response constructor
  const {status, statusText, headers} = record.getResponseInfo();
 
  // get a ReadableStream from the WARC record and return streaming response
  return new Response(record.getReadableStream(), {status, statusText, headers});
}
```
  
  

## Node Usage

Although designed for the browser, `warcio.js` should also work in Node, though it does not using native Node streams or native zlib.

After installing the package, for example, with `yarn add warcio`, the above example could be run as follows in Node:


```javascript
const { WARCParser } = require('warcio');
const fs = require('fs');


async function readWARC(filename) {
  const rawStream = fs.createReadStream(filename);

  const parser = new WARCParser();

  for await (const record of parser.iterRecords(rawStream)) {
    // ways to access warc data
    console.log(record.warcType);
    console.log(record.warcTargetURI);
    console.log(record.warcHeader('WARC-Target-URI'));
    console.log(record.warcHeaders.headers.get('WARC-Record-ID'));
  }
}
```


## CLI Indexing Tools

### index

The tool does includes command-line interface which can be used in node to index WARC files (similar to python `warcio index`)

```
warcio.js index <path-to-warc> --fields <comma,sep,fields>
```

The index command accepts an optional comma-separated field list include any offset,length,WARC headers and HTTP headers, prefixed with `http:`, eg:

```shell
warcio.js index ./test/data/example.warc --fields warc-type,warc-target-uri,http:content-type,offset,length
{"warc-type":"warcinfo","offset":0,"length":484}
{"warc-type":"warcinfo","offset":484,"length":705}
{"warc-type":"response","warc-target-uri":"http://example.com/","http:content-type":"text/html","offset":1189,"length":1365}
{"warc-type":"request","warc-target-uri":"http://example.com/","offset":2554,"length":800}
{"warc-type":"revisit","warc-target-uri":"http://example.com/","http:content-type":"text/html","offset":3354,"length":942}
{"warc-type":"request","warc-target-uri":"http://example.com/","offset":4296,"length":800}
```

### cdx-index

It can also generate standard CDX(J) indexes in CDX, CDXJ, and line delimited-JSON formats, using standard CDX fields:

```shell
warcio.js cdx-index <path-to-warc> --format cdxj
warcio.js cdx-index ./test/data/example.warc 
com,example)/ 20170306040206 {"url":"http://example.com/","mime":"text/html","status":200,"digest":"G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK","length":1365,"offset":1189,"filename":"example.warc"}
com,example)/ 20170306040348 {"url":"http://example.com/","mime":"warc/revisit","status":200,"digest":"G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK","length":942,"offset":3354,"filename":"example.warc"
```
### Programmatic usage

The indexers can also be used programmatically, including in the browser.
The following example provides a writer that outputs each entry to the console.

```javascript
import { CDXIndexer } from 'warcio';

async function indexWARC(url) {
  const response = await fetch(url);
  const indexer = new CDXIndexer({format: 'cdxj'}, {
    write(cdx) {
      console.log(cdx);
    }
  });
  
  await indexer.run([{stream: response.body, filename: url}]);
}
```

## Work in Progress

This library is still a small prototype. Core functionality not yet implemented in `warcio.js` compared to python `warcio`:
- Writing WARC files
- Chunked Decoding
- Reading ARC files
- Digest computation.
- URL canonicalization


## Differences from node-warc

The [node-warc](https://github.com/N0taN3rd/node-warc) package is optimized for use in Node specifically. `node-warc` also includes various capture utilities which are out of scope for `warcio.js`.

`warcio.js` is intended to run in browser and in node, and to have an interface comparable to the python `warcio`.

Wherever possible, an attempt is made to maintain compatibility. For example, the WARC record accessors, `record.warcType`, `record.warcTargetURI` in `warcio.js` are compatible with the ones used in `node-warc`.


