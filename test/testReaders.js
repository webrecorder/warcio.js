"use strict";

import test from 'ava';

import pako from 'pako';

import { LimitReader, StreamReader } from '../index';

import { getReader } from './utils';

const decoder = new TextDecoder("utf-8");
const encoder = new TextEncoder("utf-8");


// ===========================================================================
async function readLines(t, input, expected) {
  const stream = new StreamReader(getReader(input));

  let line;

  const output = [];

  for await (const line of await stream.iterLines()) {
    output.push(line);
  }

  t.deepEqual(output, expected);
}

// ===========================================================================
// Compression utils
function compressMembers(chunks, method = "gzip") {
  const buffers = [];

  for (const chunk of chunks) {
    const binChunk = encoder.encode(chunk);
    switch (method) {
      case "deflate":
        buffers.push(pako.deflate(binChunk));
        break;

      case "deflateRaw":
        buffers.push(pako.deflateRaw(binChunk));
        break;

      case "gzip":
        buffers.push(pako.gzip(binChunk));
        break;

      default:
        buffers.push(binChunk);
    }
  }

  return Buffer.concat(buffers);
}


async function readDecomp(t, chunks, expectedOffsets, splitSize = 0, inc = 1) {
  if (splitSize === 0) {
    await _readDecomp(t, chunks, expectedOffsets, splitSize);
  } else {
    for (let i = 1; i <= splitSize; i += inc) {
      await _readDecomp(t, chunks, expectedOffsets, i);
    }
  }
}

async function _readDecomp(t, chunks, expectedOffsets, splitSize) {
  const input = compressMembers(chunks);

  const splits = [];

  if (splitSize === 0) {
    splits.push(input);
  } else {
    let count = 0;
    while (count < input.length) {
      splits.push(input.slice(count, count + splitSize));
      count += splitSize;
    }
  }

  const stream = new StreamReader(getReader(splits));

  //const stream = new StreamReader(decomp);

  //let chunk = await stream.read();

  const buff = [];

  const offsets = [];

  for await (const chunk of stream.iterChunks()) {
    offsets.push(stream.getRawOffset());
    buff.push(decoder.decode(chunk));
    //chunk = await stream.read();
  }

  //t.is(buff, chunks.join(""));
  t.deepEqual(buff, chunks);

  t.deepEqual(offsets, expectedOffsets);

  // try parsing each chunk individually
  if (chunks.length > 1) {
    const first = offsets[0];
    const newOffsets = offsets.slice(1).map((offset) => offset - first);
    await readDecomp(t, chunks.slice(1), newOffsets, splitSize);
  }
}

async function readDecompFully(t, chunks, expected) {
  const input = compressMembers(chunks);

  const stream = new StreamReader(getReader([input]));

  t.deepEqual(decoder.decode(await stream.readFully()), expected);
}

async function readDecompTypes(t, chunk, expected, methods) {
  for (const [decompress, compress, match] of methods) {
    const input = compressMembers([chunk], compress);
    const stream = new StreamReader(getReader([input]), decompress);
    const result = decoder.decode(await stream.readFully());
    
    if (match) {
      t.is(result, expected, JSON.stringify([compress, decompress, match]));
    } else {
      t.not(result, expected);
    }
  }
}

async function readDecompLines(t, chunks, expected) {
  const input = compressMembers(chunks);

  const stream = new StreamReader(getReader([input]));

  //const stream = new StreamReader(decomp);

  const lines = [];

  for await (const line of await stream.iterLines()) {
    lines.push(line);
  }

  t.deepEqual(lines, expected);
}


async function readChunkSizes(t, chunks, sizes, expected) {
  const inputs = [[compressMembers(chunks)], chunks];

  for (const input of inputs) {
    const stream = new StreamReader(getReader(input));

    const readChunks = [];

    for (const size of sizes) {
      let chunk = null;
      if (size === "line") {
        chunk = await stream.readline();
      } else {
        chunk = decoder.decode(await stream.readSize(size));
      }
      readChunks.push(chunk);
    }

    t.deepEqual(readChunks, expected);
  }
}

async function readWithLimit(t, chunks, limit, offset, expected) {

  const reader = new LimitReader(new StreamReader(getReader(chunks)), limit, offset);

  const value =  await reader.readFully();

  const output = decoder.decode(value);

  t.deepEqual(output, expected);

  const res = await reader.read();
  t.is(res.done, true);
}


// ===========================================================================
// ===========================================================================
// Tests
test('readline() test 1', readLines,
  [
    "ABC\nDEFBLAHBLAH\nFOO",
    "BAR\n\n"
  ],
  [
    "ABC\n",
    "DEFBLAHBLAH\n",
    "FOOBAR\n",
    "\n"
  ]
);


test('readline() test 2', readLines,
  [
    `ABC\r
TEST
BART\r\
ABC`,
    "FOO"
  ],
  [
    "ABC\r\n",
    "TEST\n",
    "BART\rABCFOO",
  ]
);


test('decompressed reader single member', readDecomp,
  [
    'Some Data\nto read',
  ], [37]
);




test('decompressed reader multi member', readDecomp,
  [
    'Some Data',
    'Some\n More Data',
    'Another Chunk of Data',
    'extra data'
  ], [29, 64, 105, 135]
);


test('decompressed reader single member (1 to 10 byte chunks)', readDecomp,
  [
    'Some Data\nto read',
  ], [37], 10
);


test('decompressed reader multi member (1 to 15 byte chunks)', readDecomp,
  [
    'Some Data',
    'Some\n More Data',
    'Another Chunk of Data',
    'extra data'
  ], [29, 64, 105, 135], 15, 5
);


test('readfully decompressed', readDecompFully,
  [
    'Some Data\nMore Data\nAnother Line',
    'New Chunk\nSame Chunk\n',
    'Single Line\n',
    'Next'
  ],
`Some Data
More Data
Another LineNew Chunk
Same Chunk
Single Line
Next`
);


test('read compress / decompress types', readDecompTypes,
  'Some Data More Data','Some Data More Data', [
    //decompress compress valid
    ['gzip', 'gzip', true],
    ['gzip', 'deflate', true],
    ['gzip', 'deflateRaw', false],
    ['gzip', null, true],

    ['deflate', 'deflate', true],
    ['deflate', 'gzip', true],
    ['deflate', 'deflateRaw', true],
    ['deflate', null, true],

    ['deflateRaw', 'deflateRaw', true],
    ['deflateRaw', 'deflate', false],
    ['deflateRaw', 'gzip', false],
    ['deflateRaw', null, true],

    [null, null, true],
    [null, 'gzip', false],
    [null, 'deflate', false],
    [null, 'deflateRaw', false],

  ]
);


test('readline decompressed', readDecompLines,
  [
    'Some Data\nMore Data\nAnother Line',
    'New Chunk\nSame Chunk\n',
    'Single Line\n',
    'Next'
  ],
  [
    'Some Data\n',
    'More Data\n',
    'Another LineNew Chunk\n',
    'Same Chunk\n',
    'Single Line\n',
    'Next'
  ]
);

test('readsizes compressed and not compressed', readChunkSizes,
  [
    'Some Data',
    'Some\n More Data\n',
    '\nAnother Chunk of Data\n',
    'extra data'
  ],
  [4, 11, 9, 1, "line", "line", -1],
  ['Some',
   ' DataSome\n ',
   'More Data',
   '\n',
   '\n',
   'Another Chunk of Data\n',
   'extra data'
  ]
);

test('LimitReader, no offset', readWithLimit,
  [
    'Some\n',
    'Data'
  ],
  7, 0,
  'Some\nDa');


test('LimitReader, offset <1 chunk', readWithLimit,
  [
    'Some\n',
    'Data'
  ],
  8, 3,
  'e\nData');

test('LimitReader, offset 1 chunk', readWithLimit,
  [
    'Some\n',
    'Data'
  ],
  4, 5,
  'Data');

test('LimitReader, offset >1 chunk', readWithLimit,
  [
    'Some\n',
    'Dat',
    'Even More',
    ' Data'
  ],
  13, 9,
  'ven More Data');


test('toStreamReader conversions, misc edge cases', async t => {

  t.is(StreamReader.toStreamReader(null), null);
  t.is(StreamReader.toStreamReader('x'), null);

  const res = StreamReader.toStreamReader(getReader(['abc']));
  t.true(res instanceof StreamReader);
});

test('skip fully', async t => {
  const res = StreamReader.toStreamReader(getReader(['abc']));
  t.is(await res.readSize(-1, true), 3);
  t.is(await res.readSize(-1, true), 0);
  t.deepEqual(await res.readSize(-1, false), new Uint8Array());
});





