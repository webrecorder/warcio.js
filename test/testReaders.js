/*eslint-env node */
"use strict";

import test from "ava";

import pako from "pako";

import { getReader } from "./utils";

import { LimitReader, AsyncIterReader } from "../main";

const decoder = new TextDecoder("utf-8");
const encoder = new TextEncoder("utf-8");

// ===========================================================================
async function readLines(t, input, expected, maxLength = 0) {
  //const reader = new AsyncIterReader(getReader(input));
  const reader = new AsyncIterReader(input.map((str) => encoder.encode(str)));

  const output = [];

  for await (const line of await reader.iterLines(maxLength)) {
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

  const reader = new AsyncIterReader(getReader(splits));

  //const reader = new AsyncIterReader(decomp);

  //let chunk = await reader.read();

  const buff = [];

  const offsets = [];

  for await (const chunk of reader) {
    offsets.push(reader.getRawOffset());
    buff.push(decoder.decode(chunk));
    //chunk = await reader.read();
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

  const reader = new AsyncIterReader(getReader([input]));

  t.deepEqual(decoder.decode(await reader.readFully()), expected);
}

async function readDecompTypes(t, chunk, expected, methods) {
  for (const [decompress, compress, match] of methods) {
    const input = compressMembers([chunk], compress);
    const reader = new AsyncIterReader(getReader([input]), decompress);
    const result = decoder.decode(await reader.readFully());

    if (match) {
      t.is(result, expected, JSON.stringify([compress, decompress, match]));
    } else {
      t.not(result, expected);
    }
  }
}

async function readDecompLines(t, chunks, expected) {
  const input = compressMembers(chunks);

  const reader = new AsyncIterReader(getReader([input]));

  //const reader = new AsyncIterReader(decomp);

  const lines = [];

  for await (const line of await reader.iterLines()) {
    lines.push(line);
  }

  t.deepEqual(lines, expected);
}

async function readChunkSizes(t, chunks, sizes, expected) {
  const inputs = [[compressMembers(chunks)], chunks];
  //const inputs = [[compressMembers(chunks)]];

  for (const input of inputs) {
    const reader = new AsyncIterReader(getReader(input));

    const readChunks = [];

    for (const size of sizes) {
      let chunk = null;
      if (size === "line") {
        chunk = await reader.readline();
      } else {
        chunk = decoder.decode(await reader.readSize(size));
      }
      readChunks.push(chunk);
    }

    t.deepEqual(readChunks, expected);
  }
}

async function readWithLimit(t, chunks, limit, offset, expected) {
  const reader = new LimitReader(
    new AsyncIterReader(getReader(chunks)),
    limit,
    offset
  );

  const value = await reader.readFully();

  const output = decoder.decode(value);

  t.deepEqual(output, expected);

  const res = await reader[Symbol.asyncIterator]().next();
  t.is(res.done, true);
}

// ===========================================================================
// ===========================================================================
// Tests
test(
  "readline() test 1",
  readLines,
  ["ABC\nDEFBLAHBLAH\nFOO", "BAR\n\n"],
  ["ABC\n", "DEFBLAHBLAH\n", "FOOBAR\n", "\n"]
);

test(
  "readline() test with maxLength",
  readLines,
  ["ABC\nDEFBLAHBLAH\nFOO", "BAR\n\n"],
  ["ABC", "\n", "DEF", "BLA", "HBL", "AH\n", "FOO", "BAR", "\n", "\n"],
  3
);

test(
  "readline() test 2",
  readLines,
  [
    `ABC\r
TEST
BART\r\
ABC`,
    "FOO",
  ],
  ["ABC\r\n", "TEST\n", "BART\rABCFOO"]
);

test(
  "readline() test 2 with maxLength",
  readLines,
  [
    `ABC\r
TEST
BART\r\
ABC`,
    "FOO",
  ],
  ["ABC\r\n", "TEST\n", "BART\r", "ABCFO", "O"],
  5
);

test(
  "decompressed reader single member",
  readDecomp,
  ["Some Data\nto read"],
  [37]
);

test(
  "decompressed reader multi member",
  readDecomp,
  ["Some Data", "Some\n More Data", "Another Chunk of Data", "extra data"],
  [29, 64, 105, 135]
);

test(
  "decompressed reader single member (1 to 10 byte chunks)",
  readDecomp,
  ["Some Data\nto read"],
  [37],
  10
);

test(
  "decompressed reader multi member (1 to 15 byte chunks)",
  readDecomp,
  ["Some Data", "Some\n More Data", "Another Chunk of Data", "extra data"],
  [29, 64, 105, 135],
  15,
  5
);

test(
  "readfully decompressed",
  readDecompFully,
  [
    "Some Data\nMore Data\nAnother Line",
    "New Chunk\nSame Chunk\n",
    "Single Line\n",
    "Next",
  ],
  `Some Data
More Data
Another LineNew Chunk
Same Chunk
Single Line
Next`
);

test(
  "read compress / decompress types",
  readDecompTypes,
  "Some Data More Data",
  "Some Data More Data",
  [
    //decompress compress valid
    ["gzip", "gzip", true],
    ["gzip", "deflate", true],
    ["gzip", "deflateRaw", false],
    ["gzip", null, true],

    ["deflate", "deflate", true],
    ["deflate", "gzip", true],
    ["deflate", "deflateRaw", true],
    ["deflate", null, true],

    ["deflateRaw", "deflateRaw", true],
    ["deflateRaw", "deflate", false],
    ["deflateRaw", "gzip", false],
    ["deflateRaw", null, true],

    [null, null, true],
    [null, "gzip", false],
    [null, "deflate", false],
    [null, "deflateRaw", false],
  ]
);

test(
  "readline decompressed",
  readDecompLines,
  [
    "Some Data\nMore Data\nAnother Line",
    "New Chunk\nSame Chunk\n",
    "Single Line\n",
    "Next",
  ],
  [
    "Some Data\n",
    "More Data\n",
    "Another LineNew Chunk\n",
    "Same Chunk\n",
    "Single Line\n",
    "Next",
  ]
);

test(
  "readsizes compressed and not compressed",
  readChunkSizes,
  [
    "Some Data",
    "Some\n More Data\n",
    "\nAnother Chunk of Data\n",
    "extra data",
  ],
  [4, 11, 9, 1, "line", "line", -1],
  [
    "Some",
    " DataSome\n ",
    "More Data",
    "\n",
    "\n",
    "Another Chunk of Data\n",
    "extra data",
  ]
);

test(
  "LimitReader, no offset",
  readWithLimit,
  ["Some\n", "Data"],
  7,
  0,
  "Some\nDa"
);

test(
  "LimitReader, offset <1 chunk",
  readWithLimit,
  ["Some\n", "Data"],
  8,
  3,
  "e\nData"
);

test(
  "LimitReader, offset 1 chunk",
  readWithLimit,
  ["Some\n", "Data"],
  4,
  5,
  "Data"
);

test(
  "LimitReader, offset >1 chunk",
  readWithLimit,
  ["Some\n", "Dat", "Even More", " Data"],
  13,
  9,
  "ven More Data"
);

test("AsyncIterReader conversions", async (t) => {
  async function* iterData() {
    yield encoder.encode("test\n");
    yield encoder.encode("data\n");
  }

  const iter = iterData();
  const res2 = new AsyncIterReader(iter);
  t.true(res2 instanceof AsyncIterReader);
  t.is(res2._sourceIter, iter);

  t.is(await res2.readline(), "test\n");
  t.is(await res2.readline(), "data\n");

  t.throws(() => new AsyncIterReader(123), {
    message: "Invalid Stream Source",
  });
});

test("skip fully", async (t) => {
  const res = new AsyncIterReader(getReader(["abc"]));
  t.is(await res.readSize(-1, true), 3);
  t.is(await res.readSize(-1, true), 0);
  t.deepEqual(await res.readSize(-1, false), new Uint8Array());
});

test("getReadableStream", async (t) => {
  const reader = new AsyncIterReader(getReader(["some\ntext"]));
  const reader2 = new AsyncIterReader(reader.getReadableStream());
  t.is(decoder.decode(await reader2.readFully()), "some\ntext");
});

test("limitreader + readline", async (t) => {
  const reader = new LimitReader(
    new AsyncIterReader([encoder.encode("test\ndata\n")]),
    7
  );
  t.is(await reader.readline(3), "tes");
  t.is(await reader.readline(5), "t\n");
  t.is(await reader.readline(5), "da");
});

test("readsize + readsize", async (t) => {
  const reader = new AsyncIterReader(getReader(["test\ndata"]));

  t.is(decoder.decode(await reader.readSize(3)), "tes");
  t.is(await reader.readline(), "t\n");
  t.is(decoder.decode(await reader.readSize(2)), "da");
  t.is(await reader.readline(), "ta");
});

test("readline + readsize, ignore chunks", async (t) => {
  const reader = new AsyncIterReader(
    getReader(["test\ndata\ndata"]),
    null,
    true
  );

  t.is(await reader.readline(), "test\n");
  t.is(await reader.readline(), "data\n");
  t.is(decoder.decode(await reader.readSize(3)), "dat");
  t.is(await reader.readline(), "a");
  t.is(decoder.decode(await reader.readSize(2)), "");
});

test("test chunks", async (t) => {
  const data =
    "\
4\r\n\
Wiki\r\n\
5\r\n\
pedia\r\n\
E\r\n\
 in\r\n\
\r\n\
chunks.\r\n\
0\r\n\
\r\n";

  const reader = new AsyncIterReader(getReader([data]), null, true);
  t.is(decoder.decode(await reader.readFully()), "Wikipedia in\r\n\r\nchunks.");
});

test("test compressed chunks", async (t) => {
  const data = compressMembers(["test", "some\n", "mo\rre", "data"]);

  async function* source() {
    yield (10).toString(16);
    yield "\r\n";
    yield data.slice(0, 10);
    yield "\r\n";
    yield (25).toString(16);
    yield "\r\n";
    yield data.slice(10, 35);
    yield "\r\n";
    yield (data.length - 35).toString(16);
    yield "\r\n";
    yield data.slice(35);
    yield "\r\n";
    yield "0\r\n\r\n";
  }

  async function* sourceEnc() {
    for await (const chunk of source()) {
      yield typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    }
  }

  const reader = new AsyncIterReader(sourceEnc(), "gzip", true);
  t.is(decoder.decode(await reader.readFully()), "testsome\nmo\rredata");
});

test("test chunked specified, non-chunked actual", async (t) => {
  async function readChunked(data, compress = null, errored = false) {
    const reader = new AsyncIterReader(getReader([data]), compress, true);
    const res = decoder.decode(await reader.readFully());
    t.is(reader.errored, errored);
    return res;
  }

  // Non-chunked
  t.is(await readChunked("xyz123!@#"), "xyz123!@#");

  //Non-chunked data, numbers only:
  t.is(await readChunked("ABCDEABCDEABCDEABCDE"), "ABCDEABCDEABCDEABCDE");

  //Non-chunked data, numbers new line, large:
  t.is(
    await readChunked("ABCDEABCDEABCDEABCDE\r\n"),
    "ABCDEABCDEABCDEABCDE\r\n"
  );

  //Non-chunked, attempt decompression
  t.is(await readChunked("ABCDE", "gzip"), "ABCDE");

  //Non-chunked, actually compressed
  t.is(await readChunked(compressMembers(["ABCDE"]), "gzip"), "ABCDE");

  //Non-chunked, starts like chunked
  t.is(await readChunked("1\r\nxyz123!@#"), "1\r\nxyz123!@#");

  //Error: invalid second chunk length
  t.is(await readChunked("4\r\n1234\r\nZ\r\n12", null, true), "1234Z\r\n12");

  //Error: invalid second chunk, cut-off chunk
  t.is(await readChunked("4\r\n1234\r\n4\r\n12", null, true), "123412");

  //Error: invalid second chunk, no end \r\n
  t.is(await readChunked("4\r\n1234\r\n4\r\n567890", null, true), "1234567890");

  // zero length chunk
  t.is(await readChunked("0\r\n\r\n"), "");
});
