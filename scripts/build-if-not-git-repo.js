/* eslint-env node */

// Runs a webpack build when not installed in a git repository (i.e. when installed from GitHub in node_modules)
// Largely pulled from https://github.com/typicode/husky/blob/9d3eb31cd14d3fbdb77225d23a0c5a11f71beb2c/src/index.ts#L23

import { spawnSync } from "child_process";

/**
 * Logger
 * @param {string} msg
 * @returns {void}
 */
const l = (msg) => console.log(`warcio - ${msg}`);

/**
 * Git command
 * @param {string[]} args
 * @returns {cp.SpawnSyncReturns<Buffer>}
 */
const git = (args) => spawnSync("git", args, { stdio: "inherit" });

// Ensure that we're inside a Git repository
// If git command is not found, status is null and we should return
// That's why status value needs to be checked explicitly
if (git(["rev-parse"]).status !== 0 || process.argv.includes("--force")) {
  l("git command not found, running build");
  spawnSync("yarn", ["run", "build"], { stdio: "inherit" });
  l("build completed");
}
