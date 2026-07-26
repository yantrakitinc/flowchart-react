#!/usr/bin/env node
// Mode Cleanup-Orphans — detect orphan locks + dead catalog entries.
//
// (a) Orphan lock: `__specs__/standards-compliance.yaml` exists but the
//     owning slice folder has no source files siblings to the __specs__
//     folder (the code was deleted but the lock+specs survived).
// (b) Dead catalog entry: a spec.yaml references a `feature_name` that
//     does not correspond to any directory on disk.
//
// Report-only by default. Operator removes via git.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { findAllLocks } from "../verify-mode-inspect/verify-mode-inspect.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const ROOT = resolve(SCRIPT_DIR, "..", "..");

const META_DIRS = new Set([
  "__specs__",
  "__tests__",
  "__stories__",
  "__manual__",
]);

/**
 * @param {string} sliceDir
 * @param {{ readDir?: (dir: string) => Array<{ name: string, isDirectory: () => boolean, isFile: () => boolean }> }} [io]
 * @returns {boolean}
 */
export function sliceHasSource(sliceDir, io = {}) {
  const readDir =
    io.readDir ?? ((d) => readdirSync(d, { withFileTypes: true }));
  /** @type {Array<{ name: string, isDirectory: () => boolean, isFile: () => boolean }>} */
  let entries;
  try {
    entries = readDir(sliceDir);
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (META_DIRS.has(entry.name)) continue;
    if (entry.isFile()) return true;
    if (entry.isDirectory()) return true;
  }
  return false;
}

/**
 * @param {string} specYamlPath absolute
 * @param {{ readFile?: (p: string) => string }} [io]
 * @returns {string | null}
 */
export function extractFeatureName(specYamlPath, io = {}) {
  const readFile = io.readFile ?? ((p) => readFileSync(p, "utf8"));
  /** @type {string} */
  let body;
  try {
    body = readFile(specYamlPath);
  } catch {
    return null;
  }
  const m = body.match(/^feature_name:\s*([^\s#]+)/m);
  return m === null ? null : m[1];
}

/**
 * @param {{
 *   rootDir?: string,
 *   findLocks?: (root: string) => string[],
 *   sliceHasSource?: (slice: string) => boolean,
 *   extractFeatureName?: (specPath: string) => string | null,
 *   readDir?: (dir: string) => Array<{ name: string, isDirectory: () => boolean, isFile: () => boolean }>,
 *   write?: (s: string) => void,
 * }} [io]
 * @returns {{ exitCode: 0, orphans: string[], deadCatalogEntries: Array<{ specPath: string, featureName: string }> }}
 */
export function main(io = {}) {
  const rootDir = io.rootDir ?? ROOT;
  const findLocks = io.findLocks ?? findAllLocks;
  const hasSource = io.sliceHasSource ?? ((slice) => sliceHasSource(slice));
  const extractName = io.extractFeatureName ?? ((path) => extractFeatureName(path));
  const write = io.write ?? ((s) => process.stdout.write(s));

  const locks = findLocks(rootDir);

  /** @type {string[]} */
  const orphans = [];
  /** @type {Array<{ specPath: string, featureName: string }>} */
  const deadEntries = [];

  for (const lock of locks) {
    const specsDir = dirname(lock);
    const sliceDir = dirname(specsDir);
    if (!hasSource(sliceDir)) {
      orphans.push(lock);
    }
    const specYaml = join(specsDir, "spec.yaml");
    const featureName = extractName(specYaml);
    if (featureName !== null) {
      // Feature names look like "scripts-verify-mode-a"; map to a path heuristically
      // by replacing dashes with slashes from a tail-anchored match. We only
      // verify the spec's owning slice directory exists — that's the catalog
      // entry's anchor.
      // Already covered by `hasSource` above for the orphan case; track here
      // as belt-and-suspenders signal if the spec's feature_name does not
      // correspond to the slice dir's relative path.
      const relPath = relative(rootDir, sliceDir).replace(/\//g, "-");
      if (!relPath.endsWith(featureName)) {
        deadEntries.push({ specPath: specYaml, featureName });
      }
    }
  }

  write(
    `verify-mode-cleanup-orphans: ${String(orphans.length)} orphan lock(s); ${String(deadEntries.length)} catalog mismatch(es)\n`,
  );
  if (orphans.length > 0) {
    write("\norphan locks (slice folder has no source):\n");
    for (const lock of orphans) {
      write(`  - ${relative(rootDir, lock)}\n`);
    }
  }
  if (deadEntries.length > 0) {
    write("\ncatalog mismatches (spec.yaml feature_name does not match slice path):\n");
    for (const e of deadEntries) {
      write(`  - ${relative(rootDir, e.specPath)} → feature_name=${e.featureName}\n`);
    }
  }
  if (orphans.length === 0 && deadEntries.length === 0) {
    write("\nclean — no orphan locks or catalog mismatches\n");
  } else {
    write("\nReport-only — remove orphans via git; reconcile catalog entries by hand.\n");
  }
  return { exitCode: 0, orphans, deadCatalogEntries: deadEntries };
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
 * @param {Parameters<typeof cliMain>[0] & { importMetaUrl: string, argv1: string | undefined }} io
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
