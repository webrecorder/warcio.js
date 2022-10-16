import { lstatSync, createReadStream } from "fs";
import { basename } from "path";
import yargs from "yargs";
import { WritableStreamBuffer } from "stream-buffers";

import { indexCommandArgs, cdxIndexCommandArgs } from "./args";
import { Indexer, CDXIndexer, StreamResults } from "../lib";

const BUFF_SIZE = 1024 * 128;

// ===========================================================================
export function main(
  args: string[] = [],
  out: WritableStreamBuffer | NodeJS.WriteStream = process.stdout
) {
  let promise = Promise.resolve();

  yargs
    .usage("$0 [command]")
    // Basic Indexer
    .command({
      command: "index <filename..>",
      describe: "Index WARC(s)",
      builder: (yargs) => {
        return indexCommandArgs;
      },
      handler: async (args) => {
        promise = new Indexer(args, out).run(loadStreams([args.filename]));
      },
    })
    // CDX Indexer
    .command({
      command: "cdx-index <filename..>",
      describe: "CDX(J) Index of WARC(s)",
      builder: (yargs) => {
        return cdxIndexCommandArgs;
      },
      handler: async (args) => {
        promise = new CDXIndexer(args, out).run(loadStreams([args.filename]));
      },
    })
    .demandCommand(1, "Please specify a command")
    .strictCommands()
    .help()
    .parseAsync(args);

  return promise;
}

function loadStreams(filenames: string[]) {
  return filenames.reduce<StreamResults>((accumulator, filename) => {
    if (!lstatSync(filename).isFile()) {
      process.stderr.write(`Skipping ${filename}, not a file\n`);
      return accumulator;
    }

    const reader = createReadStream(filename, { highWaterMark: BUFF_SIZE });
    filename = basename(filename);
    accumulator.push({ filename, reader });
    return accumulator;
  }, []);
}
