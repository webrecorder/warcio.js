import { DEFAULT_CDX_FIELDS, DEFAULT_FIELDS } from "../lib/indexer";
import type yargs from "yargs";

const coerce = (array: string[]): string[] => {
  return array.flatMap((v) => v.split(",")).filter((x) => !!x);
};

export const indexCommandArgs = (yarg: yargs.Argv) => {
  return yarg
    .positional("filenames", {
      describe: "WARC file(s) to index",
      type: "string",
      array: true,
      demandOption: "true",
    })
    .option("fields", {
      alias: "f",
      describe: "fields to include in index",
      type: "array",
      default: DEFAULT_FIELDS,
      coerce,
    });
};

export type IndexCommandArgs = Awaited<
  ReturnType<typeof indexCommandArgs>["argv"]
>;

export const cdxIndexCommandArgs = (yarg: yargs.Argv) => {
  return yarg
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
    })
    .option("fields", {
      alias: "f",
      describe: "fields to include in index",
      type: "array",
      default: DEFAULT_CDX_FIELDS,
      coerce,
    });
};

export type CdxIndexCommandArgs = Awaited<
  ReturnType<typeof cdxIndexCommandArgs>["argv"]
>;
