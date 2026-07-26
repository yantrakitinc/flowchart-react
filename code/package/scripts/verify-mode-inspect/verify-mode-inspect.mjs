#!/usr/bin/env node
// Mode Inspect — read-only walk of every standards-compliance.yaml in the repo.
//
// For each lock, reports relative path, status, last_validated, freshness vs
// source (fresh | stale | unknown). Always exits 0 — inspection is informational.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  checkFreshness,
  defaultGitLastCommit,
} from "../verify-standards-freshness/verify-standards-freshness.mjs";
import { parseScalarFields } from "../verify-mode-d/verify-mode-d.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const ROOT = resolve(SCRIPT_DIR, "..", "..");

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "storybook-static",
  "coverage",
  "dist",
  "build",
]);

/**
 * Walk rootDir; return absolute paths of every
 * `<...>/__specs__/standards-compliance.yaml`.
 *
 * @param {string} rootDir
 * @param {{ readDir?: (dir: string) => Array<{ name: string, isDirectory: () => boolean }>, statFile?: (p: string) => unknown }} [io]
 * @returns {string[]}
 */
export function findAllLocks(rootDir, io = {}) {
  const readDir =
    io.readDir ?? ((dir) => readdirSync(dir, { withFileTypes: true }));
  const statFile = io.statFile ?? statSync;
  /** @type {string[]} */
  const locks = [];
  /**
   * @param {string} dir
   */
  function walk(dir) {
    /** @type {Array<{ name: string, isDirectory: () => boolean }>} */
    let entries;
    try {
      entries = readDir(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      if (!entry.isDirectory()) continue;
      const full = join(dir, entry.name);
      if (entry.name === "__specs__") {
        const lock = join(full, "standards-compliance.yaml");
        try {
          statFile(lock);
          locks.push(lock);
        } catch {
          // no lock in this __specs__ — skip
        }
      } else {
        walk(full);
      }
    }
  }
  walk(rootDir);
  return locks.sort();
}

/**
 * Inspect a single lock.
 *
 * @param {string} lockPath absolute
 * @param {{ readFile?: (p: string) => string, gitLastCommit?: (folder: string, lockFile: string) => string | null }} [io]
 * @returns {{ lockPath: string, status: string, lastValidated: string, freshness: "fresh" | "stale" | "unknown" }}
 */
export function inspectLock(lockPath, io = {}) {
  const readFile = io.readFile ?? ((p) => readFileSync(p, "utf8"));
  const gitLastCommit = io.gitLastCommit ?? defaultGitLastCommit;
  /** @type {string} */
  let contents;
  try {
    contents = readFile(lockPath);
  } catch {
    return {
      lockPath,
      status: "(unreadable)",
      lastValidated: "",
      freshness: "unknown",
    };
  }
  const fields = parseScalarFields(contents);
  const status = fields["status"] ?? "(missing)";
  const lastValidated = fields["last_validated"] ?? "(missing)";
  /** @type {"fresh" | "stale" | "unknown"} */
  let freshness = "unknown";
  if (status === "locked") {
    const stampMs = Date.parse(lastValidated);
    if (!Number.isNaN(stampMs)) {
      const result = checkFreshness(lockPath, stampMs, { gitLastCommit });
      freshness = result.ok ? "fresh" : "stale";
    }
  }
  return { lockPath, status, lastValidated, freshness };
}

/**
 * @param {ReadonlyArray<{ lockPath: string, status: string, lastValidated: string, freshness: "fresh" | "stale" | "unknown" }>} rows
 * @param {string} rootDir
 * @returns {{ text: string, lockedCount: number, unlockedCount: number, otherCount: number, staleCount: number }}
 */
export function formatReport(rows, rootDir) {
  /** @type {string[]} */
  const lines = [];
  lines.push(`verify-mode-inspect: ${String(rows.length)} lock(s) found\n`);
  let lockedCount = 0;
  let unlockedCount = 0;
  let otherCount = 0;
  let staleCount = 0;
  for (const row of rows) {
    const rel = relative(rootDir, row.lockPath);
    /** @type {string} */
    let tag;
    if (row.status === "locked") {
      tag = "  LOCKED";
      lockedCount++;
    } else if (row.status === "unlocked") {
      tag = "UNLOCKED";
      unlockedCount++;
    } else {
      tag = `[${row.status}]`;
      otherCount++;
    }
    const freshTag = row.freshness === "stale" ? " [STALE]" : "";
    if (row.freshness === "stale") staleCount++;
    lines.push(`  ${tag}  ${row.lastValidated}  ${rel}${freshTag}\n`);
  }
  lines.push(
    `\nsummary: ${String(lockedCount)} locked, ${String(unlockedCount)} unlocked, ${String(otherCount)} other, ${String(staleCount)} stale\n`,
  );
  return {
    text: lines.join(""),
    lockedCount,
    unlockedCount,
    otherCount,
    staleCount,
  };
}

/**
 * @param {{
 *   rootDir?: string,
 *   findLocks?: (root: string) => string[],
 *   readFile?: (p: string) => string,
 *   gitLastCommit?: (folder: string, lockFile: string) => string | null,
 *   write?: (s: string) => void,
 * }} [io]
 * @returns {{ exitCode: 0, rows: Array<{ lockPath: string, status: string, lastValidated: string, freshness: "fresh" | "stale" | "unknown" }>, summary: ReturnType<typeof formatReport> }}
 */
export function main(io = {}) {
  const rootDir = io.rootDir ?? ROOT;
  const findLocks = io.findLocks ?? ((root) => findAllLocks(root));
  const write = io.write ?? ((s) => process.stdout.write(s));
  const locks = findLocks(rootDir);
  const rows = locks.map((lock) => inspectLock(lock, io));
  const summary = formatReport(rows, rootDir);
  write(summary.text);
  return { exitCode: 0, rows, summary };
}

/**
 * @param {Parameters<typeof main>[0] & { exit?: (code: number) => void }} [io]
 */
export function cliMain(io = {}) {
  const { exit, ...mainIo } = io;
  const doExit = exit ?? ((code) => process.exit(code));
  const { exitCode } = main(mainIo);
  doExit(exitCode);
}

/**
 * @param {string} importMetaUrl
 * @param {string | undefined} argv1
 * @returns {boolean}
 */
export function isCliInvocation(importMetaUrl, argv1) {
  if (argv1 === undefined || argv1 === "") return false;
  return importMetaUrl === pathToFileURL(argv1).href;
}

/**
 * @param {{
 *   importMetaUrl: string,
 *   argv1: string | undefined,
 *   exit?: (code: number) => void,
 *   rootDir?: string,
 *   findLocks?: (root: string) => string[],
 *   readFile?: (p: string) => string,
 *   gitLastCommit?: (folder: string, lockFile: string) => string | null,
 *   write?: (s: string) => void,
 * }} io
 * @returns {boolean}
 */
export function maybeRunCli(io) {
  if (!isCliInvocation(io.importMetaUrl, io.argv1)) return false;
  const { importMetaUrl: _1, argv1: _2, ...rest } = io;
  void _1;
  void _2;
  cliMain(rest);
  return true;
}

maybeRunCli({ importMetaUrl: import.meta.url, argv1: process.argv[1] });
