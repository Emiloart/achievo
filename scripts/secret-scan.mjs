#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const MAX_BYTES = 1024 * 1024;
const GIT_ARGS = ["diff", "--staged", "--name-only", "--diff-filter=ACMRT"];

const patterns = [
  { name: "aws-access-key", regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "aws-secret-key", regex: /\bASIA[0-9A-Z]{16}\b/g },
  { name: "github-token", regex: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g },
  { name: "slack-token", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: "private-key", regex: /-----BEGIN (EC|RSA|OPENSSH|DSA) PRIVATE KEY-----/g },
  { name: "mnemonic", regex: /\b(mnemonic|seed phrase|seedphrase)\b/gi },
  { name: "hex-secret", regex: /\b0x[a-fA-F0-9]{64}\b/g },
];

function runGit() {
  try {
    return execFileSync("git", GIT_ARGS, { encoding: "utf8" }).trim();
  } catch {
    console.error("Secret scan requires a git repository with staged files.");
    process.exit(1);
  }
}

function isTextFile(path) {
  try {
    const stat = statSync(path);
    return stat.isFile() && stat.size <= MAX_BYTES;
  } catch {
    return false;
  }
}

function scanFile(path) {
  const content = readFileSync(path, "utf8");
  const findings = [];
  for (const pattern of patterns) {
    const matches = content.match(pattern.regex);
    if (matches && matches.length) {
      findings.push({ name: pattern.name, count: matches.length });
    }
  }
  return findings;
}

const output = runGit();
if (!output) {
  process.exit(0);
}

const files = output
  .split(/\r?\n/)
  .map((value) => value.trim())
  .filter(Boolean);

const findings = [];
for (const file of files) {
  if (!isTextFile(file)) continue;
  const absolute = resolve(process.cwd(), file);
  const hits = scanFile(absolute);
  if (hits.length) {
    findings.push({ file, hits });
  }
}

if (findings.length) {
  console.error("Commit blocked: potential secrets detected in staged files.");
  for (const entry of findings) {
    const details = entry.hits.map((hit) => `${hit.name}(${hit.count})`).join(", ");
    console.error(`- ${entry.file}: ${details}`);
  }
  console.error("Remove secrets or move them to a secure vault before committing.");
  process.exit(1);
}
