#!/usr/bin/env node
// Flow-doc coverage verifier.
//
// Walks every behavior-bearing file under `src/` and asserts that each
// exported function / class-method has a co-located flow doc at
// `<feature>/__specs__/flows/<kebab-name>.flow.<md|yaml>`. During the
// migration from the legacy `.flow.md` shape (CODE_CONFIDENCE-style
// markdown) to the new SPEC_CONTRACT `.flow.yaml` shape (machine-
// readable map), BOTH extensions are accepted. A folder is compliant
// when EITHER form exists for each exported behavior.
//
// Pure Node + zero external dependencies. Helpers are exported so the
// Vitest suite can exercise every branch without spawning the script.

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { listAllFiles } from "../lib/walk.mjs";
import { toKebabCandidates } from "../lib/kebab.mjs";
import { listExportedBehaviors } from "../lib/exports.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const ROOT_DIR = resolve(SCRIPT_DIR, "..", "..");
const DEFAULT_SRC = resolve(ROOT_DIR, "src");

/**
 * Accepted flow-doc extensions. Both forms are valid during the
 * SPEC_CONTRACT migration. New work writes `.flow.yaml`; legacy
 * `.flow.md` is kept on the allowlist until each feature is retrofitted.
 *
 * @type {ReadonlyArray<".flow.md" | ".flow.yaml">}
 */
export const FLOW_DOC_EXTENSIONS = [".flow.yaml", ".flow.md"];

/**
 * Default IO ports — broken out so the test suite can mark them
 * covered by calling them directly.
 */
export const defaultExistsSync = (/** @type {string} */ p) => existsSync(p);
export const defaultReadFile = (/** @type {string} */ p) =>
  readFileSync(p, "utf8");
export const defaultListFiles = (/** @type {string} */ p) => listAllFiles(p);
export const defaultListExportedBehaviors = (/** @type {string} */ p) =>
  listExportedBehaviors(p);
export const defaultStdoutWrite = (/** @type {string} */ s) =>
  process.stdout.write(s);
export const defaultStderrWrite = (/** @type {string} */ s) =>
  process.stderr.write(s);

/**
 * Decide whether a source file is in scope for flow-doc verification.
 *
 * Skip rules:
 *   - filename is `types.ts` or `index.ts`
 *   - filename ends in `.test.ts(x)` / `.config.ts`
 *   - lives inside `__tests__/` or `__specs__/` (any depth)
 *   - lives inside `__specs__.backup/` (backup-folder carve-out)
 *   - first ~2KB carry the `SETUP FILE.` marker
 *
 * @param {string} filePath absolute path under src/
 * @param {{ readFile?: (p: string) => string }} [injected]
 * @returns {boolean} true if the file MUST be checked
 */
export function isInScope(filePath, injected = {}) {
  const readFile = injected.readFile ?? defaultReadFile;
  const name = basename(filePath);
  if (name === "types.ts" || name === "index.ts") return false;
  if (name.endsWith(".test.ts") || name.endsWith(".test.tsx")) return false;
  if (name.endsWith(".config.ts")) return false;
  if (filePath.includes("/__tests__/")) return false;
  if (filePath.includes("/__specs__/")) return false;
  if (filePath.includes("/__specs__.backup/")) return false;
  if (filePath.endsWith(".d.ts")) return false;
  if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) return false;

  const head = readFile(filePath).slice(0, 2000);
  if (/SETUP FILE\./.test(head)) return false;

  return true;
}

/**
 * For a given exported behavior name, returns every candidate flow-doc
 * filename (kebab-cased + every accepted extension). A folder is
 * compliant when ONE of the candidates exists on disk.
 *
 * @param {string} behaviorName exported function / method identifier
 * @returns {string[]}
 */
export function flowDocCandidates(behaviorName) {
  const kebabs = toKebabCandidates(behaviorName);
  const out = [];
  for (const k of kebabs) {
    for (const ext of FLOW_DOC_EXTENSIONS) {
      out.push(`${k}${ext}`);
    }
  }
  return out;
}

/**
 * Walk `srcDir` and audit every in-scope source file.
 *
 * @param {string} srcDir absolute path to walk
 * @param {{
 *   listFiles?: (root: string) => string[],
 *   listExportedBehaviors?: (file: string) => Array<{ name: string }>,
 *   existsSync?: (p: string) => boolean,
 *   readFile?: (p: string) => string,
 * }} [injected]
 * @returns {{
 *   exportedCount: number,
 *   missing: Array<{ flowsDir: string, behavior: string, sourceFile: string, candidates: string[] }>,
 * }}
 */
export function audit(srcDir, injected = {}) {
  const listFiles = injected.listFiles ?? defaultListFiles;
  const listBehaviors =
    injected.listExportedBehaviors ?? defaultListExportedBehaviors;
  const exists = injected.existsSync ?? defaultExistsSync;

  /** @type {Array<{ flowsDir: string, behavior: string, sourceFile: string, candidates: string[] }>} */
  const missing = [];
  let exportedCount = 0;

  for (const file of listFiles(srcDir)) {
    if (!isInScope(file, { readFile: injected.readFile })) continue;
    const behaviors = listBehaviors(file);
    if (behaviors.length === 0) continue;
    const flowsDir = join(dirname(file), "__specs__", "flows");
    for (const b of behaviors) {
      exportedCount += 1;
      const candidates = flowDocCandidates(b.name);
      const found = candidates.some((c) => exists(join(flowsDir, c)));
      if (!found) {
        missing.push({
          flowsDir,
          behavior: b.name,
          sourceFile: file,
          candidates,
        });
      }
    }
  }

  return { exportedCount, missing };
}

/**
 * Format the audit result for stdout / stderr.
 *
 * @param {{ exportedCount: number, missing: Array<{ flowsDir: string, behavior: string, sourceFile: string, candidates: string[] }> }} result
 * @param {string} rootDir absolute root for relative path display
 * @returns {{ exitCode: 0 | 1, stdout: string, stderr: string }}
 */
export function formatReport(result, rootDir) {
  if (result.missing.length === 0) {
    return {
      exitCode: 0,
      stdout: `verify-flow-coverage: OK (${String(result.exportedCount)} exported behavior(s) checked)\n`,
      stderr: "",
    };
  }
  const lines = [
    `verify-flow-coverage: ${String(result.missing.length)} missing flow doc(s)`,
  ];
  for (const m of result.missing) {
    const tried = m.candidates.join(" | ");
    lines.push(
      `  MISSING: ${relative(rootDir, m.flowsDir)}/{${tried}} for export ${m.behavior} in ${relative(rootDir, m.sourceFile)}`,
    );
  }
  return {
    exitCode: 1,
    stdout: "",
    stderr: `${lines.join("\n")}\n`,
  };
}

/**
 * Entry point. Defaults to walking `code/web/src/`.
 *
 * @param {{
 *   srcDir?: string,
 *   rootDir?: string,
 *   listFiles?: (root: string) => string[],
 *   listExportedBehaviors?: (file: string) => Array<{ name: string }>,
 *   existsSync?: (p: string) => boolean,
 *   readFile?: (p: string) => string,
 *   write?: (s: string) => void,
 *   writeErr?: (s: string) => void,
 * }} [io]
 * @returns {{ exitCode: 0 | 1 }}
 */
export function main(io = {}) {
  const srcDir = io.srcDir ?? DEFAULT_SRC;
  const rootDir = io.rootDir ?? ROOT_DIR;
  const write = io.write ?? defaultStdoutWrite;
  const writeErr = io.writeErr ?? defaultStderrWrite;
  const result = audit(srcDir, {
    listFiles: io.listFiles,
    listExportedBehaviors: io.listExportedBehaviors,
    existsSync: io.existsSync,
    readFile: io.readFile,
  });
  const report = formatReport(result, rootDir);
  if (report.stdout) write(report.stdout);
  if (report.stderr) writeErr(report.stderr);
  return { exitCode: report.exitCode };
}

/**
 * CLI entry — exported so the test suite can drive it without spawning a
 * child process.
 *
 * @param {{ exit?: (code: number) => void }} [io]
 * @returns {void}
 */
export function cliMain(io = {}) {
  const exit = io.exit ?? ((code) => process.exit(code));
  const { exitCode } = main();
  exit(exitCode);
}

/**
 * True when the script is being executed as a CLI.
 *
 * @param {string} importMetaUrl
 * @param {string | undefined} argv1
 * @returns {boolean}
 */
export function isCliInvocation(importMetaUrl, argv1) {
  if (argv1 === undefined || argv1 === "") return false;
  return importMetaUrl === pathToFileURL(argv1).href;
}

/**
 * Wrapped CLI dispatcher.
 *
 * @param {{
 *   importMetaUrl: string,
 *   argv1: string | undefined,
 *   exit?: (code: number) => void,
 * }} io
 * @returns {boolean}
 */
export function maybeRunCli(io) {
  if (!isCliInvocation(io.importMetaUrl, io.argv1)) return false;
  cliMain({ exit: io.exit });
  return true;
}

// Module-load CLI gate.
maybeRunCli({ importMetaUrl: import.meta.url, argv1: process.argv[1] });
