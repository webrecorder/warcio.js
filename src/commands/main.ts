import { lstatSync, createReadStream } from "node:fs";
import { basename } from "node:path";
import { stdout, stderr } from "node:process";
import { WritableStreamBuffer } from "stream-buffers";
import yargs from "yargs";

import { indexCommandArgs, cdxIndexCommandArgs } from "./args";
import { Indexer, CDXIndexer, StreamResults } from "../lib";

const BUFF_SIZE = 1024 * 128;

// ===========================================================================
export function main(
  args: string[] = [],
  out: WritableStreamBuffer | NodeJS.WriteStream = stdout
) {
  let promise = Promise.resolve();

  yargs
    .usage("$0 [command]")
    // Basic Indexer
    .command({
      command: "index <filenames..>",
      describe: "Index WARC(s)",
      builder: () => {
        return indexCommandArgs;
      },
      handler: async (args) => {
        promise = new Indexer(args, out).run(loadStreams(args.filenames));
      },
    })
    // CDX Indexer
    .command({
      command: "cdx-index <filenames..>",
      describe: "CDX(J) Index of WARC(s)",
      builder: () => {
        return cdxIndexCommandArgs;
      },
      handler: async (args) => {
        promise = new CDXIndexer(args, out).run(loadStreams(args.filenames));
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
      stderr.write(`Skipping ${filename}, not a file\n`);
      return accumulator;
    }

    const reader = createReadStream(filename, { highWaterMark: BUFF_SIZE });
    filename = basename(filename);
    accumulator.push({ filename, reader });
    return accumulator;
  }, []);
}
