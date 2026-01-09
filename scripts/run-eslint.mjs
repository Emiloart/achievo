#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { relative, posix } from "node:path";

const rawFiles = process.argv.slice(2);
const webFiles = rawFiles
  .filter((file) => file.startsWith("web/"))
  .map((file) => relative("web", file))
  .map((file) => posix.normalize(file.replace(/\\/g, "/")))
  .filter((file) => !file.startsWith(".."));

if (!webFiles.length) {
  process.exit(0);
}

const args = ["--prefix", "web", "exec", "--", "eslint", "--max-warnings=0", ...webFiles];
execFileSync("npm", args, { stdio: "inherit" });
