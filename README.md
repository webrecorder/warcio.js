# warcio.js

Streaming web archive (WARC) file support for modern browsers and Node.

This package represents an approxipate port Javascript port of the Python [warcio](https://github.com/webrecorder/warcio) module.

[![Node.js CI](https://github.com/webrecorder/warcio.js/actions/workflows/ci.yaml/badge.svg)](https://github.com/webrecorder/warcio.js/actions/workflows/ci.yaml)
[![codecov](https://codecov.io/gh/webrecorder/warcio.js/branch/master/graph/badge.svg)](https://codecov.io/gh/webrecorder/warcio.js)


## Browser Usage 

### Reading WARC Files

warcio.js is designed to read WARC files incrementally using [async iterators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator).

Browser Streams API [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) is also supported.

Gzip-compressed WARC records are automatically decompressed using [pako](https://github.com/nodeca/pako) library.

<details>
  <summary>This example can be used in the browser to parse a streaming WARC file:</summary>


  ```html
  <script type="module">
  import { WARCParser } from 'https://unpkg.com/warcio/dist/warcio.js';


  async function readWARC(url) {
    const response = await fetch(url);
    
    const parser = new WARCParser(response.body);

    for await (const record of parser) {
      // ways to access warc data
      console.log(record.warcType);
      console.log(record.warcTargetURI);
      console.log(record.warcHeader('WARC-Target-URI'));
      console.log(record.warcHeaders.headers.get('WARC-Record-ID'));

      // iterator over WARC content one chunk at a time (as Uint8Array)
      for await (const chunk of record) {
        ...
      }

      // access content as text
      const text = await record.contentText();
    }
  }

  readWARC('https://example.com/path/to/mywarc.warc');
  </script>

  ```
</details>

The `WARCParser()` constructor accepts any async iterator or object with a [ReadableStream.getReader()](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/getReader) style `read()` method.

A shorthand `for await (const record of WARCParser.iterRecords(reader))` can also be used when the parser object is not needed.


### Streaming WARCs in the Browser

A key property of `warcio.js` is to support streaming WARC records from a server via a [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)

For example, the following could be used to load a single WARC record (via a Range request), parse the HTTP headers, and return a streaming `Response` from a Service Worker.

The response continues reading from the upstream source.

<details>
  <summary>Streaming Example</summary>

  ```javascript
  import { WARCParser } from 'https://unpkg.com/warcio/dist/warcio.js';


  async function streamWARCRecord(url, offset, length) {
    const response = await fetch(url, {
      "headers":  {"Range": `bytes=${offset}-${offset + length - 1}`}
    });

    const parser = new WARCParser(response.body);
    
    // parse WARC record, which includes WARC headers and HTTP headers
    const record = await parser.parse();
    
    // get the response options for Response constructor
    const {status, statusText, headers} = record.getResponseInfo();
   
    // get a ReadableStream from the WARC record and return streaming response
    return new Response(record.getReadableStream(), {status, statusText, headers});
  }
  ```
</details>

### Accessing WARC Content

`warcio.js` provides several ways to access WARC record content. When dealing with HTTP response records,
the default behavior is to decode transfer and content encoding, de-chunking and uncompressing if necessary.

For example, the following accessors, as shown above, provide access to the decompressed/dechunked content.

<details>
  <summary>WARC Record Accessors:</summary>

  ```javascript

    // iterate over each chunk (Uint8Array)
    for await (const chunk of record) {
      ...
    }

    // iterate over lines
    for await (const line of record.iterLines()) {
      ...
    }

    // read one line
    const line = await record.readline()
    
    // read entire contents as Uint8Array
    const payload = await record.readFully(true)

    // read entire contents as a String (calls readFully)
    const text = await record.contentText()

  ```
</details>

#### Raw WARC Payload

The raw WARC content is also available using the following methods:

<details>
  <summary>Accessing WARC Payload:</summary>

  ```javascript

    // iterate over each raw chunk (not dechunked or decompressed)
    for await (const chunk of record.reader) {
      ...
    }

    const rawPayload = await record.readFully(false)
  ```

  The `readFully()` method can read either the raw or decoded content.
  When using `readFully()`, the payload is stored in the record as `record.payload` so that it can be accessed again.

  Note that decoded and raw access should not be mixed. Attempting to access raw data after beginning decoding will result in an exception:

  ```javascript
    // read decoded line
    const line = await record.readline()

    // XX this will throw error, raw data no longer available
    const full = await record.readFully(false)

    // this is ok
    const fullDecoded = await record.readFully(true)
  ```
</details>


## Node Usage

`warcio.js` can also be used in Node, though it does not use the native zlib (due to a limitation with indexing multi-member gzip files).

After installing the package, for example, with `yarn add warcio`, the above example could be run as follows in Node:


<details>
  <summary>warcio in Node:</summary>

  ```javascript
  const { WARCParser } = require('warcio');
  const fs = require('fs');


  async function readWARC(filename) {
    const nodeStream = fs.createReadStream(filename);

    const parser = new WARCParser(nodeStream);

    for await (const record of parser) {
      // ways to access warc data
      console.log(record.warcType);
      console.log(record.warcTargetURI);
      console.log(record.warcHeader('WARC-Target-URI'));
      console.log(record.warcHeaders.headers.get('WARC-Record-ID'));

      // iterator over WARC content one chunk at a time (as Uint8Array)
      for await (const chunk of record) {
        ...
      }

      // OR, access content as text
      const text = await record.contentText();
    }
  }
  ```
</details>

To build the browser-packaged files in `dist/`, run `yarn run build`.

To run tests, run `yarn run test`.


## CLI Indexing Tools

### index

The tool does includes command-line interface which can be used in Node to index WARC files (similar to python `warcio index`)

```
warcio.js index <path-to-warc> --fields <comma,sep,fields>
```

The index command accepts an optional comma-separated field list include any offset,length,WARC headers and HTTP headers, prefixed with `http:`, eg:

<details>
  <summary>index command:</summary>

  ```shell
  warcio.js index ./test/data/example.warc --fields warc-type,warc-target-uri,http:content-type,offset,length
  {"warc-type":"warcinfo","offset":0,"length":484}
  {"warc-type":"warcinfo","offset":484,"length":705}
  {"warc-type":"response","warc-target-uri":"http://example.com/","http:content-type":"text/html","offset":1189,"length":1365}
  {"warc-type":"request","warc-target-uri":"http://example.com/","offset":2554,"length":800}
  {"warc-type":"revisit","warc-target-uri":"http://example.com/","http:content-type":"text/html","offset":3354,"length":942}
  {"warc-type":"request","warc-target-uri":"http://example.com/","offset":4296,"length":800}
  ```
</details>


### cdx-index

It can also generate standard CDX(J) indexes in CDX, CDXJ, and line delimited-JSON formats, using standard CDX fields:

<details>
  <summary>cdx-index command:</summary>

  ```shell
  warcio.js cdx-index <path-to-warc> --format cdxj
  warcio.js cdx-index ./test/data/example.warc 
  com,example)/ 20170306040206 {"url":"http://example.com/","mime":"text/html","status":200,"digest":"G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK","length":1365,"offset":1189,"filename":"example.warc"}
  com,example)/ 20170306040348 {"url":"http://example.com/","mime":"warc/revisit","status":200,"digest":"G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK","length":942,"offset":3354,"filename":"example.warc"
  ```
</details>


### Programmatic Usage

The indexers can also be used programmatically, both in the browser and in Node with a custom writer.

The indexer provide an async iterator which yields the index data as an object instead of writing it anywhere.

For example, the following snippet demonstrates a writer that logs all HTML files in a WARC:

<details>
  <summary>Using CDXIndexer programmatically:</summary>

  ```html
  <script type="module">
  import { CDXIndexer } from 'https://unpkg.com/warcio/dist/warcio.js';

  async function indexWARC(url) {
    const response = await fetch(url);
    const indexer = new CDXIndexer()

    const files = [{reader: response.body, filename: url}];

    for await (const cdx of indexer.iterIndex(files)) {
      if (cdx['mime'] === 'text/html') {
        console.log(cdx['url'] + ' is an HTML page');
      }
    }
  }

  indexWARC('https://example.com/path/to/mywarc.warc');
  </script>
  ```
</details>


## Writing WARC Files

WARCs can be created using `WARCRecord.create()` static method, and serialized using `WARCSerializer.serialize()`

Passing in `WARCSerializer.serialize({gzip: true})` will create a GZIP compressed record.

The payload can be provided as an async iterator. The `WARC-Payload-Digest` and `WARC-Block-Digest` are automatically computed if not provided in the `warcHeaders`.

(Note that at this time, computing the digest requires buffering the payload fully, due to limitation of `crypto.subtle.digest()` apis in requiring a full buffer).


<details>
  <summary>An example of generating WARCs in the browser:</summary>

  ```html
  <script type="module">
    import { WARCRecord, WARCSerializer } from 'https://unpkg.com/warcio/dist/warcio.js';

    async function main() {

      // First, create a warcinfo record
      const warcVersion = "WARC/1.1";

      const info = {
        "software": "warcio.js in browser"
      }
      const filename = "sample.warc";

      const warcinfo = await WARCRecord.createWARCInfo({filename, warcVersion}, info);

      const serializedWARCInfo = await WARCSerializer.serialize(warcinfo);

      // Create a sample response
      const url = "http://example.com/";
      const date = "2000-01-01T00:00:00Z";
      const type = "response";
      const headers = {
          "Custom-Header": "somevalue",
          "Content-Type": 'text/plain; charset="UTF-8"'
      };

      async function* content() {
        // content should be a Uint8Array, so encoding if emitting astring
        yield new TextEncoder().encode('sample content\n');
      }

      const record = await WARCRecord.create({url, date, type, warcVersion, headers}, content());

      const serializedRecord = await WARCSerializer.serialize(record);

      console.log(new TextDecoder().decode(serializedWARCInfo));
      console.log(new TextDecoder().decode(serializedRecord));
    }

    main();
  </script>
  ```
</details>


<details>
  <summary>An example of generating WARCs in Node:</summary>

  ```javascript
    const { WARCRecord, WARCSerializer } = require("warcio");

    async function main() {

      // First, create a warcinfo record
      const warcVersion = "WARC/1.1";

      const info = {
        "software": "warcio.js in node"
      }
      const filename = "sample.warc";

      const warcinfo = await WARCRecord.createWARCInfo({filename, warcVersion}, info);

      const serializedWARCInfo = await WARCSerializer.serialize(warcinfo);

      // Create a sample response
      const url = "http://example.com/";
      const date = "2000-01-01T00:00:00Z";
      const type = "response";
      const headers = {
          "Custom-Header": "somevalue",
          "Content-Type": 'text/plain; charset="UTF-8"'
      };

      async function* content() {
        // content should be a Uint8Array, so encoding if emitting astring
        yield new TextEncoder().encode('sample content\n');
      }

      const record = await WARCRecord.create({url, date, type, warcVersion, headers}, content());

      const serializedRecord = await WARCSerializer.serialize(record);

      console.log(new TextDecoder().decode(serializedWARCInfo));
      console.log(new TextDecoder().decode(serializedRecord));
    }

    main();
  ```
</details>

## Not Yet Implemented

This library is still new and some functionality is 'not yet implemented' when compared to python `warcio` including:

- ~~Writing WARC files [#2](https://github.com/webrecorder/warcio.js/issues/2)~~ Implemented!
- ~~Chunked Payload Decoding [#3](https://github.com/webrecorder/warcio.js/issues/3)~~ Implemented!
- Brotli Payload Decoding [#4](https://github.com/webrecorder/warcio.js/issues/4)
- Reading ARC files [#5](https://github.com/webrecorder/warcio.js/issues/5)
- ~~Digest computation [#6](https://github.com/webrecorder/warcio.js/issues/6)~~ Implemented!
- URL canonicalization [#7](https://github.com/webrecorder/warcio.js/issues/7)

They should eventually be added in future versions. See the referenced issues to track progress on each of these items.


## Differences from node-warc

The [node-warc](https://github.com/N0taN3rd/node-warc) package is designed for use in Node specifically.

`node-warc` also includes various capture utilities which are out of scope for `warcio.js`.

`warcio.js` is intended to run in browser and in Node, and to have an interface comparable to the python `warcio`.

Wherever possible, an attempt is made to maintain compatibility. For example, the WARC record accessors, `record.warcType`, `record.warcTargetURI` in `warcio.js` are compatible with the ones used in `node-warc`.


