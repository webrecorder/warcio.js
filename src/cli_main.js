/*eslint-env node */
import { Indexer, CDXIndexer } from "./indexer";

const BUFF_SIZE = 1024 * 128;


// ===========================================================================
function main(args, out) {
  let promise = Promise.resolve(true);

  require("yargs").
    usage("$0 [command]").

  // Basic Indexer
    command("index <filename..>", "Index WARC(s)", (yargs) => {
      yargs.
        positional("filename", {
          "describe": "WARC file(s) to index",
          "type": "string"
        }).
        option("f", {
          "alias": "fields",
          "describe": "fields to include in index",
          "type": "string"
        });
    }, async (args) => {
    /* istanbul ignore next */
      out = out || process.stdout;
      promise = new Indexer(args, out).run(loadStreams(args.filename));
    }).

  // CDX Indexer
    command("cdx-index <filename..>", "CDX(J) Index of WARC(s)", (yargs) => {
      yargs.
        positional("filename", {
          "describe": "WARC file(s) to index",
          "type": "string"
        }).
        option("a", {
          "alias": "all",
          "describe": "index all WARC records",
          "type": "boolean"
        }).
        option("format", {
          "describe": "output format",
          "choices": ["json", "cdxj", "cdx"],
          "default": "cdxj"
        }).
        option("noSurt", {
          "describe": "Use plain urlkey, do not convert to SURT form (Sort-friendly URI Reordering Transform)",
          "type": "boolean",
        });
    }, async (args) => {
    /* istanbul ignore next */
      out = out || process.stdout;
      promise = new CDXIndexer(args, out).run(loadStreams(args.filename));
    }).

    demandCommand(1, "Please specify a command").
    strictCommands().
    help().
    parse(args);

  return promise;
}


function loadStreams(filenames) {
  global.Headers = require("node-fetch").Headers;

  const path = require("path");
  const fs = require("fs");

  return filenames.map((filename) => {
    if (!fs.lstatSync(filename).isFile()) {
      process.stderr.write(`Skipping ${filename}, not a file\n`);
      return {};
    }

    const reader = fs.createReadStream(filename, {highWaterMark: BUFF_SIZE});
    filename = path.basename(filename);
    return {filename, reader};
  });
}


// ===========================================================================
export { main };

