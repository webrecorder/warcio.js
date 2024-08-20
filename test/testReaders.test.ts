import pako from "pako";
import { getReader } from "./utils";
import { LimitReader, AsyncIterReader } from "../src/lib";

const decoder = new TextDecoder("utf-8");
const encoder = new TextEncoder();

// ===========================================================================
async function readLines(input: string[], expected: string[], maxLength = 0) {
  //const reader = new AsyncIterReader(getReader(input));
  const reader = new AsyncIterReader(input.map((str) => encoder.encode(str)));

  const output: string[] = [];

  for await (const line of reader.iterLines(maxLength)) {
    output.push(line);
  }

  expect(output).toEqual(expected);
}

// ===========================================================================
// Compression utils
function compressMembers(
  chunks: string[],
  method: string | null = "gzip",
): Uint8Array {
  const buffers: Uint8Array[] = [];

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

async function readDecomp(
  chunks: string[],
  expectedOffsets: number[],
  splitSize = 0,
  inc = 1,
) {
  if (splitSize === 0) {
    await _readDecomp(chunks, expectedOffsets, splitSize);
  } else {
    for (let i = 1; i <= splitSize; i += inc) {
      await _readDecomp(chunks, expectedOffsets, i);
    }
  }
}

async function _readDecomp(
  chunks: string[],
  expectedOffsets: number[],
  splitSize: number,
) {
  const input = compressMembers(chunks);

  const splits: Uint8Array[] = [];

  if (splitSize === 0) {
    splits.push(input);
  } else {
    let count = 0;
    while (count < input.length) {
      splits.push(input.subarray(count, count + splitSize));
      count += splitSize;
    }
  }

  const reader = new AsyncIterReader(getReader(splits));

  //const reader = new AsyncIterReader(decomp);

  //let chunk = await reader.read();

  const buff: string[] = [];

  const offsets: number[] = [];

  for await (const chunk of reader) {
    offsets.push(reader.getRawOffset());
    buff.push(decoder.decode(chunk));
    //chunk = await reader.read();
  }

  //expect(buff).toEqual(chunks.join(""));
  expect(buff).toEqual(chunks);

  expect(offsets.length).toBeGreaterThan(0);
  expect(offsets).toEqual(expectedOffsets);

  // try parsing each chunk individually
  if (chunks.length > 1) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length already checked
    const first = offsets[0]!;
    const newOffsets = offsets.slice(1).map((offset) => offset - first);
    await readDecomp(chunks.slice(1), newOffsets, splitSize);
  }
}

async function readDecompFully(chunks: string[], expected: string) {
  const input = compressMembers(chunks);

  const reader = new AsyncIterReader(getReader([input]));

  expect(decoder.decode(await reader.readFully())).toBe(expected);
}

async function readDecompTypes(
  chunk: string,
  expected: string,
  methods: [string | null, string | null, boolean][],
) {
  for (const [decompress, compress, match] of methods) {
    const input = compressMembers([chunk], compress);
    const reader = new AsyncIterReader(getReader([input]), decompress);
    const result = decoder.decode(await reader.readFully());

    if (match) {
      expect(result, JSON.stringify([compress, decompress, match])).toBe(
        expected,
      );
    } else {
      expect(result).not.toBe(expected);
    }
  }
}

async function readDecompLines(chunks: string[], expected: string[]) {
  const input = compressMembers(chunks);

  const reader = new AsyncIterReader(getReader([input]));

  //const reader = new AsyncIterReader(decomp);

  const lines = [];

  for await (const line of reader.iterLines()) {
    lines.push(line);
  }

  expect(lines).toEqual(expected);
}

const READ_WHOLE_LINE = "line";

async function readChunkSizes(
  chunks: string[],
  sizes: (number | typeof READ_WHOLE_LINE)[],
  expected: string[],
) {
  const inputs = [[compressMembers(chunks)], chunks];
  //const inputs = [[compressMembers(chunks)]];

  for (const input of inputs) {
    const reader = new AsyncIterReader(getReader(input));

    const readChunks: string[] = [];

    for (const size of sizes) {
      let chunk = null;
      if (size === "line") {
        chunk = await reader.readline();
      } else {
        chunk = decoder.decode(await reader.readSize(size));
      }
      readChunks.push(chunk);
    }

    expect(readChunks).toEqual(expected);
  }
}

async function readWithLimit(
  chunks: string[],
  limit: number,
  offset: number,
  expected: string,
) {
  const reader = new LimitReader(
    new AsyncIterReader(getReader(chunks)),
    limit,
    offset,
  );

  const value = await reader.readFully();

  const output = decoder.decode(value);

  expect(output).toBe(expected);

  const res = await reader[Symbol.asyncIterator]().next();
  expect(res.done).toBe(true);
}

// ===========================================================================
// ===========================================================================
// Tests
describe("readers", () => {
  test("readline() test 1", async () => {
    await readLines(
      ["ABC\nDEFBLAHBLAH\nFOO", "BAR\n\n"],
      ["ABC\n", "DEFBLAHBLAH\n", "FOOBAR\n", "\n"],
    );
  });

  test("readline() test with maxLength", async () => {
    await readLines(
      ["ABC\nDEFBLAHBLAH\nFOO", "BAR\n\n"],
      ["ABC", "\n", "DEF", "BLA", "HBL", "AH\n", "FOO", "BAR", "\n", "\n"],
      3,
    );
  });

  test("readline() test 2", async () => {
    await readLines(
      [
        `ABC\r
TEST
BART\r\
ABC`,
        "FOO",
      ],
      ["ABC\r\n", "TEST\n", "BART\rABCFOO"],
    );
  });

  test("readline() test 2 with maxLength", async () => {
    await readLines(
      [
        `ABC\r
TEST
BART\r\
ABC`,
        "FOO",
      ],
      ["ABC\r\n", "TEST\n", "BART\r", "ABCFO", "O"],
      5,
    );
  });

  test("decompressed reader single member", async () => {
    await readDecomp(["Some Data\nto read"], [37]);
  });

  test("decompressed reader multi member", async () => {
    await readDecomp(
      ["Some Data", "Some\n More Data", "Another Chunk of Data", "extra data"],
      [29, 64, 105, 135],
    );
  });

  test("decompressed reader single member (1 to 10 byte chunks)", async () => {
    await readDecomp(["Some Data\nto read"], [37], 10);
  });

  test("decompressed reader multi member (1 to 15 byte chunks)", async () => {
    await readDecomp(
      ["Some Data", "Some\n More Data", "Another Chunk of Data", "extra data"],
      [29, 64, 105, 135],
      15,
      5,
    );
  });

  test("readfully decompressed", async () => {
    await readDecompFully(
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
Next`,
    );
  });

  test("read compress / decompress types", async () => {
    await readDecompTypes("Some Data More Data", "Some Data More Data", [
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
    ]);
  });

  test("readline decompressed", async () => {
    await readDecompLines(
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
      ],
    );
  });

  test("readsizes compressed and not compressed", async () => {
    await readChunkSizes(
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
      ],
    );
  });

  test("LimitReader, no offset", async () => {
    await readWithLimit(["Some\n", "Data"], 7, 0, "Some\nDa");
  });

  test("LimitReader, offset <1 chunk", async () => {
    await readWithLimit(["Some\n", "Data"], 8, 3, "e\nData");
  });

  test("LimitReader, offset 1 chunk", async () => {
    await readWithLimit(["Some\n", "Data"], 4, 5, "Data");
  });

  test("LimitReader, offset >1 chunk", async () => {
    await readWithLimit(
      ["Some\n", "Dat", "Even More", " Data"],
      13,
      9,
      "ven More Data",
    );
  });

  test("AsyncIterReader conversions", async () => {
    async function* iterData() {
      yield encoder.encode("test\n");
      yield encoder.encode("data\n");
    }

    const iter = iterData();
    const res2 = new AsyncIterReader(iter);
    expect(res2 instanceof AsyncIterReader).toBe(true);
    expect(res2._sourceIter).toEqual(iter);

    expect(await res2.readline()).toBe("test\n");
    expect(await res2.readline()).toBe("data\n");

    // @ts-expect-error test invalid stream source
    expect(() => new AsyncIterReader(123)).toThrow({
      message: "Invalid Stream Source",
    });
  });

  test("skip fully", async () => {
    const res = new AsyncIterReader(getReader(["abc"]));
    expect(await res.skipSize(-1)).toBe(3);
    expect(await res.skipSize(-1)).toBe(0);
    expect(await res.readSize(-1)).toEqual(new Uint8Array());
  });

  test("getReadableStream", async () => {
    const reader = new AsyncIterReader(getReader(["some\ntext"]));
    const reader2 = new AsyncIterReader(reader.getReadableStream());
    expect(decoder.decode(await reader2.readFully())).toBe("some\ntext");
  });

  test("limitreader + readline", async () => {
    const reader = new LimitReader(
      new AsyncIterReader([encoder.encode("test\ndata\n")]),
      7,
    );
    expect(await reader.readline(3)).toBe("tes");
    expect(await reader.readline(5)).toBe("t\n");
    expect(await reader.readline(5)).toBe("da");
  });

  test("readsize + readsize", async () => {
    const reader = new AsyncIterReader(getReader(["test\ndata"]));

    expect(decoder.decode(await reader.readSize(3))).toBe("tes");
    expect(await reader.readline()).toBe("t\n");
    expect(decoder.decode(await reader.readSize(2))).toBe("da");
    expect(await reader.readline()).toBe("ta");
  });

  test("readline + readsize, ignore chunks", async () => {
    const reader = new AsyncIterReader(
      getReader(["test\ndata\ndata"]),
      null,
      true,
    );

    expect(await reader.readline()).toBe("test\n");
    expect(await reader.readline()).toBe("data\n");
    expect(decoder.decode(await reader.readSize(3))).toBe("dat");
    expect(await reader.readline()).toBe("a");
    expect(decoder.decode(await reader.readSize(2))).toBe("");
  });

  test("test chunks", async () => {
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
    expect(decoder.decode(await reader.readFully())).toBe(
      "Wikipedia in\r\n\r\nchunks.",
    );
  });

  test("test compressed chunks", async () => {
    const text = ["test", "some\n", "mo\rre", "data"];
    const encodedText = encoder.encode(text.join(""));
    const data = compressMembers(text);

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
    const result = await reader.readFully();
    expect(
      decoder.decode(result),
      `expected\n${encodedText}\nbut got\n${result}`,
    ).toBe("testsome\nmo\rredata");
  });

  test("test chunked specified, non-chunked actual", async () => {
    async function readChunked(
      data: string | Uint8Array,
      compress: string | null = null,
      errored = false,
    ) {
      const reader = new AsyncIterReader(getReader([data]), compress, true);
      const res = decoder.decode(await reader.readFully());
      expect(reader.errored).toBe(errored);
      return res;
    }

    // Non-chunked
    expect(await readChunked("xyz123!@#")).toBe("xyz123!@#");

    //Non-chunked data, numbers only:
    expect(await readChunked("ABCDEABCDEABCDEABCDE")).toBe(
      "ABCDEABCDEABCDEABCDE",
    );

    //Non-chunked data, numbers new line, large:
    expect(await readChunked("ABCDEABCDEABCDEABCDE\r\n")).toBe(
      "ABCDEABCDEABCDEABCDE\r\n",
    );

    //Non-chunked, attempt decompression
    expect(await readChunked("ABCDE", "gzip")).toBe("ABCDE");

    //Non-chunked, actually compressed
    expect(await readChunked(compressMembers(["ABCDE"]), "gzip")).toBe("ABCDE");

    //Non-chunked, starts like chunked
    expect(await readChunked("1\r\nxyz123!@#")).toBe("1\r\nxyz123!@#");

    //Error: invalid second chunk length
    expect(await readChunked("4\r\n1234\r\nZ\r\n12", null, true)).toBe(
      "1234Z\r\n12",
    );

    //Error: invalid second chunk, cut-off chunk
    expect(await readChunked("4\r\n1234\r\n4\r\n12", null, true)).toBe(
      "123412",
    );

    //Error: invalid second chunk, no end \r\n
    expect(await readChunked("4\r\n1234\r\n4\r\n567890", null, true)).toBe(
      "1234567890",
    );

    // zero length chunk
    expect(await readChunked("0\r\n\r\n")).toBe("");
  });
});
