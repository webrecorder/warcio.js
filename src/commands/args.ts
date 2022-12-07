import yargs from "yargs";

export const indexCommandArgs = yargs
  .positional("filenames", {
    describe: "WARC file(s) to index",
    type: "string",
    array: true,
    demandOption: "true",
  })
  .option("fields", {
    alias: "f",
    describe: "fields to include in index",
    type: "string",
  });

export type IndexCommandArgs = Awaited<typeof indexCommandArgs.argv>;

export const cdxIndexCommandArgs = yargs
  .positional("filenames", {
    describe: "WARC file(s) to index",
    type: "string",
    array: true,
    demandOption: "true",
  })
  .option("all", {
    alias: "a",
    describe: "index all WARC records",
    type: "boolean",
  })
  .option("format", {
    describe: "output format",
    choices: ["json", "cdxj", "cdx"],
    default: "cdxj",
  })
  .option("noSurt", {
    describe:
      "Use plain urlkey, do not convert to SURT form (Sort-friendly URI Reordering Transform)",
    type: "boolean",
  });

export type CdxIndexCommandArgs = Awaited<typeof cdxIndexCommandArgs.argv>;