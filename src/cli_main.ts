/*eslint-env node */
import { lstatSync, createReadStream } from "fs";
import { basename } from "path";
import yargs from "yargs";

import { indexCommandArgs, cdxIndexCommandArgs } from "./cli_args";
import { Indexer, CDXIndexer } from "./indexer";
import { StreamResults } from "./types";

const BUFF_SIZE = 1024 * 128;

// ===========================================================================
function main(args: string[], out: NodeJS.WriteStream) {
  let promise = Promise.resolve(true);

  const argv = yargs
    .usage("$0 [command]")
    // Basic Indexer
    .command({
      command: "index <filename..>",
      describe: "Index WARC(s)",
      builder: (yargs) => {
        return indexCommandArgs;
      },
      handler: async (args) => {
        /* istanbul ignore next */
        out = out || process.stdout;
        await new Indexer(args, out).run(loadStreams([args.filename]));
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
        /* istanbul ignore next */
        out = out || process.stdout;
        await new CDXIndexer(args, out).run(loadStreams([args.filename]));
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

// ===========================================================================
export { main };
