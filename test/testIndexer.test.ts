import fs from "fs";
import { jest } from "@jest/globals";
import { main } from "../src/commands";
import {
  Indexer,
  CDXIndexer,
  CDXAndRecordIndexer,
  DEFAULT_CDX_FIELDS,
} from "../src/lib";
import { WritableStreamBuffer } from "stream-buffers";

function get_warc_path(filename: string) {
  return new URL(filename, import.meta.url).pathname;
}

async function index(params: string[], expected: string | boolean) {
  const buff = new WritableStreamBuffer();

  await main(buff, params);

  expect(buff.getContentsAsString("utf-8")).toBe(expected);
}

describe("indexer", () => {
  test("index default fields warc.gz", async () => {
    await index(
      ["index", get_warc_path("data/example.warc.gz")],
      `\
{"offset":0,"warc-type":"warcinfo"}
{"offset":353,"warc-type":"warcinfo"}
{"offset":784,"warc-type":"response","warc-target-uri":"http://example.com/"}
{"offset":2012,"warc-type":"request","warc-target-uri":"http://example.com/"}
{"offset":2621,"warc-type":"revisit","warc-target-uri":"http://example.com/"}
{"offset":3207,"warc-type":"request","warc-target-uri":"http://example.com/"}
`,
    );
  });

  test("index custom fields warc", async () => {
    await index(
      [
        "index",
        get_warc_path("data/example.warc"),
        "--fields",
        "offset,length,warc-type,http:status,http:content-type",
      ],
      `\
{"offset":0,"length":484,"warc-type":"warcinfo"}
{"offset":488,"length":705,"warc-type":"warcinfo"}
{"offset":1197,"length":1365,"warc-type":"response","http:status":200,"http:content-type":"text/html"}
{"offset":2566,"length":800,"warc-type":"request"}
{"offset":3370,"length":942,"warc-type":"revisit","http:status":200,"http:content-type":"text/html"}
{"offset":4316,"length":800,"warc-type":"request"}
{"offset":5120,"length":429,"warc-type":"metadata"}
`,
    );
  });

  test("index no line breaks", async () => {
    await index(
      ["index", get_warc_path("data/example-url-agnostic-revisit.warc.gz")],
      `\
{"offset":0,"warc-type":"warcinfo"}
{"offset":355,"warc-type":"revisit","warc-target-uri":"http://test@example.com/"}
`,
    );
  });

  test("index wget", async () => {
    await index(
      [
        "index",
        get_warc_path("data/example-wget-bad-target-uri.warc.gz"),
        "--fields",
        "offset,length,warc-type,warc-target-uri",
      ],
      `\
{"offset":0,"length":410,"warc-type":"warcinfo"}
{"offset":410,"length":414,"warc-type":"request","warc-target-uri":"http://example.com/"}
{"offset":824,"length":1154,"warc-type":"response","warc-target-uri":"http://example.com/"}
{"offset":1978,"length":317,"warc-type":"metadata","warc-target-uri":"metadata://gnu.org/software/wget/warc/MANIFEST.txt"}
{"offset":2295,"length":386,"warc-type":"resource","warc-target-uri":"metadata://gnu.org/software/wget/warc/wget_arguments.txt"}
{"offset":2681,"length":586,"warc-type":"resource","warc-target-uri":"metadata://gnu.org/software/wget/warc/wget.log"}
`,
    );
  });

  test("cdxj warc.gz", async () => {
    await index(
      ["cdx-index", get_warc_path("data/example.warc.gz")],
      `\
com,example)/ 20170306040206 {"url":"http://example.com/","mime":"text/html","status":"200","digest":"G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK","length":"1228","offset":"784","filename":"example.warc.gz"}
com,example)/ 20170306040348 {"url":"http://example.com/","mime":"warc/revisit","status":"200","digest":"G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK","length":"586","offset":"2621","filename":"example.warc.gz"}
`,
    );
  });

  test("cdxj warc.gz with referrer", async () => {
    await index(
      [
        "cdx-index",
        get_warc_path("data/example.warc.gz"),
        "--fields",
        [...DEFAULT_CDX_FIELDS, "referrer"].join(","),
      ],
      `\
com,example)/ 20170306040206 {"url":"http://example.com/","mime":"text/html","status":"200","digest":"G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK","length":"1228","offset":"784","filename":"example.warc.gz","referrer":"https://webrecorder.io/temp-MJFXHZ4S/temp/recording-session/record/http://example.com/"}
com,example)/ 20170306040348 {"url":"http://example.com/","mime":"warc/revisit","status":"200","digest":"G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK","length":"586","offset":"2621","filename":"example.warc.gz","referrer":"https://webrecorder.io/temp-MJFXHZ4S/temp/recording-session/record/http://example.com/"}
`,
    );
  });

  test("cdx11 warc.gz", async () => {
    await index(
      ["cdx-index", get_warc_path("data/example.warc.gz"), "--format", "cdx"],
      `\
com,example)/ 20170306040206 http://example.com/ text/html 200 G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK - - 1228 784 example.warc.gz
com,example)/ 20170306040348 http://example.com/ warc/revisit 200 G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK - - 586 2621 example.warc.gz
`,
    );
  });

  test("cdx11 warc", async () => {
    await index(
      ["cdx-index", get_warc_path("data/example.warc"), "--format", "cdx"],
      `\
com,example)/ 20170306040206 http://example.com/ text/html 200 G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK - - 1365 1197 example.warc
com,example)/ 20170306040348 http://example.com/ warc/revisit 200 G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK - - 942 3370 example.warc
`,
    );
  });

  test("cdx11 warc bad lengths", async () => {
    const consoleWarnSpy = jest
      .spyOn(console, "warn")
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- mocking
      .mockImplementationOnce(() => {});
    await index(
      [
        "cdx-index",
        get_warc_path("data/example-bad-length.warc"),
        "--format",
        "cdx",
      ],
      `\
com,example)/ 20170306040206 http://example.com/ text/html 200 G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK - - 1364 1197 example-bad-length.warc
com,example)/ 20170306040348 http://example.com/ warc/revisit 200 G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK - - 944 3370 example-bad-length.warc
`,
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Content-Length Too Small: Record not followed by newline, Remainder Length: 1, Offset: 2561",
    );
  });

  test("cdx json warc.gz all", async () => {
    await index(
      [
        "cdx-index",
        get_warc_path("data/example.warc.gz"),
        "--format",
        "json",
        "--all",
      ],
      `\
{"timestamp":"20170306040353","mime":"application/warc-fields","length":353,"offset":0,"filename":"example.warc.gz"}
{"timestamp":"20170306040353","mime":"application/warc-fields","length":431,"offset":353,"filename":"example.warc.gz"}
{"urlkey":"com,example)/","timestamp":"20170306040206","url":"http://example.com/","mime":"text/html","status":200,"digest":"G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK","length":1228,"offset":784,"filename":"example.warc.gz"}
{"urlkey":"com,example)/","timestamp":"20170306040206","url":"http://example.com/","digest":"3I42H3S6NNFQ2MSVX7XZKYAYSCX5QBYJ","length":609,"offset":2012,"filename":"example.warc.gz"}
{"urlkey":"com,example)/","timestamp":"20170306040348","url":"http://example.com/","mime":"warc/revisit","status":200,"digest":"G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK","length":586,"offset":2621,"filename":"example.warc.gz"}
{"urlkey":"com,example)/","timestamp":"20170306040348","url":"http://example.com/","digest":"3I42H3S6NNFQ2MSVX7XZKYAYSCX5QBYJ","length":609,"offset":3207,"filename":"example.warc.gz"}
`,
    );
  });

  test("post append", async () => {
    await index(
      [
        "cdx-index",
        get_warc_path("data/post-test.warc.gz"),
        "--fields",
        [...DEFAULT_CDX_FIELDS, "req.http:cookie"].join(","),
      ],
      `\
org,httpbin)/post?__wb_method=post&foo=bar&test=abc 20140610000859 {"url":"http://httpbin.org/post","mime":"application/json","status":"200","digest":"M532K5WS4GY2H4OVZO6HRPOP47A7KDWU","length":"720","offset":"0","filename":"post-test.warc.gz","method":"POST","requestBody":"foo=bar&test=abc","req.http:cookie":"Max-Age=3600; Path=/"}
org,httpbin)/post?__wb_method=post&a=1&b=[]&c=3 20140610001151 {"url":"http://httpbin.org/post","mime":"application/json","status":"200","digest":"M7YCTM7HS3YKYQTAWQVMQSQZBNEOXGU2","length":"723","offset":"1196","filename":"post-test.warc.gz","method":"POST","requestBody":"A=1&B=[]&C=3","req.http:cookie":"Max-Age=3600; Path=/"}
org,httpbin)/post?__wb_method=post&data=^&foo=bar 20140610001255 {"url":"http://httpbin.org/post?foo=bar","mime":"application/json","status":"200","digest":"B6E5P6JUZI6UPDTNO4L2BCHMGLTNCUAJ","length":"723","offset":"2395","filename":"post-test.warc.gz","method":"POST","requestBody":"data=^","req.http:cookie":"Max-Age=3600; Path=/"}
`,
    );
  });

  test("post append 2", async () => {
    await index(
      ["cdx-index", get_warc_path("data/post-test-more.warc")],
      `\
org,httpbin)/post?__wb_method=post&another=more^data&test=some+data 20200809195334 {"url":"https://httpbin.org/post","mime":"application/json","status":"200","digest":"7AWVEIPQMCA4KTCNDXWSZ465FITB7LSK","length":"688","offset":"0","filename":"post-test-more.warc","method":"POST","requestBody":"test=some+data&another=more%5Edata"}
org,httpbin)/post?__wb_method=post&a=json-data 20200809195334 {"url":"https://httpbin.org/post","mime":"application/json","status":"200","digest":"BYOQWRSQFW3A5SNUBDSASHFLXGL4FNGB","length":"655","offset":"1227","filename":"post-test-more.warc","method":"POST","requestBody":"a=json-data"}
org,httpbin)/post?__wb_method=post&__wb_post_data=na0kc29tzq0kza0ky2h1bmstzw5jb2rlza0kna0kzgf0yq0kma0kdqo= 20200810055049 {"url":"https://httpbin.org/post","mime":"application/json","status":"200","digest":"34LEADQD3MOBQ42FCO2WA5TUSEL5QOKP","length":"628","offset":"2338","filename":"post-test-more.warc","method":"POST","requestBody":"__wb_post_data=NA0Kc29tZQ0KZA0KY2h1bmstZW5jb2RlZA0KNA0KZGF0YQ0KMA0KDQo="}
`,
    );
  });

  test("cdx resource", async () => {
    await index(
      ["cdx-index", get_warc_path("data/example-resource.warc.gz")],
      `\
com,example,some:8080)/ 20200405201750 {"url":"http://some.example.com:8080/","mime":"text/plain","digest":"QEF4QP424P5IOPMURMAC4K6KNUTHXQW2","length":"261","offset":"0","filename":"example-resource.warc.gz"}
`,
    );
  });

  test("skip dir", async () => {
    await index(["cdx-index", "./"], false);
  });

  test("test custom CDXIndexer", async () => {
    const entries = [];
    const indexer = new CDXIndexer();

    const files = [
      {
        reader: fs.createReadStream(get_warc_path("data/example.warc.gz")),
        filename: "example.warc.gz",
      },
    ];

    for await (const cdx of indexer.iterIndex(files)) {
      entries.push({ offset: cdx["offset"], length: cdx["length"] });
    }

    expect(entries).toEqual([
      { offset: 784, length: 1228 },
      { offset: 2621, length: 586 },
    ]);
  });

  test("test custom CDXIndexer with all records", async () => {
    const entries = [];
    const indexer = new CDXIndexer({ all: true });

    const files = [
      {
        reader: fs.createReadStream(get_warc_path("data/example.warc.gz")),
        filename: "example.warc.gz",
      },
    ];

    for await (const cdx of indexer.iterIndex(files)) {
      entries.push({ offset: cdx["offset"], length: cdx["length"] });
    }

    expect(entries).toEqual([
      { offset: 0, length: 353 },
      { offset: 353, length: 431 },
      { offset: 784, length: 1228 },
      { offset: 2012, length: 609 },
      { offset: 2621, length: 586 },
      { offset: 3207, length: 609 },
    ]);
  });

  test("test custom CDXAndRecordIndexer", async () => {
    const entries = [];
    const indexer = new CDXAndRecordIndexer();

    const files = [
      {
        reader: fs.createReadStream(get_warc_path("data/example.warc.gz")),
        filename: "example.warc.gz",
      },
    ];

    for await (const { cdx, record, reqRecord } of indexer.iterIndex(files)) {
      const cdxOffset = cdx?.offset;
      const cdxLength = cdx?.length;
      const hasRequest = !!reqRecord;
      const contentType =
        record?.httpHeaders?.headers.get("Content-Type") || null;
      const dataLength = (await record?.contentText())?.length;
      entries.push({
        cdxOffset,
        cdxLength,
        dataLength,
        contentType,
        hasRequest,
      });
    }

    expect(entries).toEqual([
      {
        cdxOffset: 784,
        cdxLength: 1228,
        dataLength: 1270,
        contentType: "text/html",
        hasRequest: true,
      },
      {
        cdxOffset: 2621,
        cdxLength: 586,
        dataLength: 0,
        contentType: "text/html",
        hasRequest: true,
      },
    ]);
  });

  test("test custom CDXAndRecordIndexer with all records", async () => {
    const entries = [];
    const indexer = new CDXAndRecordIndexer({ all: true });

    const files = [
      {
        reader: fs.createReadStream(get_warc_path("data/example.warc.gz")),
        filename: "example.warc.gz",
      },
    ];

    for await (const { cdx, record, reqRecord } of indexer.iterIndex(files)) {
      const offset = cdx?.offset;
      const length = cdx?.length;
      const hasRequest = !!reqRecord;
      const contentType =
        record?.httpHeaders?.headers.get("Content-Type") || null;
      entries.push({ offset, length, contentType, hasRequest });
    }

    expect(entries).toEqual([
      { offset: 0, length: 353, contentType: null, hasRequest: false },
      { offset: 353, length: 431, contentType: null, hasRequest: false },
      { offset: 784, length: 1228, contentType: "text/html", hasRequest: true },
      { offset: 2621, length: 586, contentType: "text/html", hasRequest: true },
    ]);
  });

  test("test custom Indexer", async () => {
    const entries = [];
    const indexer = new Indexer({ fields: ["warc-type", "warc-target-uri"] });

    const files = [
      {
        reader: fs.createReadStream(get_warc_path("data/example.warc.gz")),
        filename: "example.warc.gz",
      },
    ];

    for await (const cdx of indexer.iterIndex(files)) {
      if (cdx["warc-type"] === "response" || cdx["warc-type"] === "request") {
        entries.push(cdx);
      }
    }

    expect(entries).toEqual([
      { "warc-type": "response", "warc-target-uri": "http://example.com/" },
      { "warc-type": "request", "warc-target-uri": "http://example.com/" },
      { "warc-type": "request", "warc-target-uri": "http://example.com/" },
    ]);

    // default fields
    for await (const cdx of new Indexer().iterIndex(files)) {
      expect(cdx["offset"]).toBeDefined();
    }
  });
});
