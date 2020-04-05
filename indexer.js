#!/usr/bin/env node

const fs = require('fs');
const WARCParser = require('./src/warcparser').WARCParser;
const toWebReadableStream = require('node-web-streams').toWebReadableStream;
const StreamReader = require('./src/readers').StreamReader;

global.Headers = require('node-fetch').Headers;

const DEFAULT_FIELDS = 'offset,warc-type,warc-target-uri';




async function main(args, out) { 
  if (!args) {
    args = process.argv.slice(2);
  }
  const argv = require('minimist')(args);
  if (argv._.length === 0) {
    console.log("No file specified");
    return 1;
  }

  const filename = argv._[0];

  const rawStream = fs.createReadStream(filename);

  const stream = toWebReadableStream(rawStream);

  const reader = new StreamReader(stream.getReader());

  const parser = new WARCParser(true);

  const fields = (argv.fields || argv.f || DEFAULT_FIELDS).split(",");

  for await (const record of parser.iterRecords(reader)) {
    const result = {};

    const offset = parser.offset;
    const length = await parser.recordLength();

    const special = {offset, length, filename};

    for (const field of fields) {
      const value = special[field] != undefined ? special[field] : getField(record, field);

      if (value != null) {
        result[field] = value;
      }
    }

    out = out || process.stdout;
    out.write(JSON.stringify(result) + "\n");
  }  
}

function getField(record, field) {
  if (field === "http:status") {
    if (record.httpHeaders && (record.warcType === "response" || record.warcType === "revisit")) {
      return record.httpHeaders.statusCode();
    }
    return null;
  }

  if (field.startsWith("http:")) {
    if (record.httpHeaders) {
      return record.httpHeaders.headers.get(field.slice(5));
    }
    return null;
  }

  return record.warcHeaders.headers.get(field);
}
    

exports.main = main

/* istanbul ignore if */
if (require.main === module) {
  main();
}


