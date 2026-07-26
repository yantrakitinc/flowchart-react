#!/usr/bin/env node
// verify-manual-playbooks — every callable surface has a RUNNABLE markdown manual flow.
//
// Per MANUAL_FLOWS.yaml `manual_md`: every folder that directly contains a
// `route.ts` (HTTP) or `page.tsx` (UI) MUST ship at least one
// `__specs__/manual/<flow>.md` — a copy-paste-into-the-extension adversarial flow.
//
// Markdown ONLY. There is no escape hatch:
//   - a legacy `__specs__/manual/*.yaml` is a violation (migrate it to .md)
//   - each .md MUST carry the five sections (Target / Preconditions / Steps /
//     Assertions / Report), state at least one "MUST NOT" (the adversarial negative),
//     and its Report section MUST name the POST /api/v1/manual-results route.
//
// Pure Node, zero deps. Helpers are exported so the vitest suite drives every branch.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { listAllDirs } from "../lib/walk.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const ROOT_DIR = resolve(SCRIPT_DIR, "..", "..");
const DEFAULT_APP = resolve(ROOT_DIR, "src", "app");

/** The five markdown sections every manual flow must contain. @type {ReadonlyArray<string>} */
export const REQUIRED_SECTIONS = [
  "## Target",
  "## Preconditions",
  "## Steps",
  "## Assertions",
  "## Report",
];

/** Injectable IO ports (the test overrides these). */
export const defaultListAllDirs = (/** @type {string} */ p) => listAllDirs(p);
export const defaultReadDirSync = (/** @type {string} */ p) => readdirSync(p);
export const defaultStatSync = (/** @type {string} */ p) => statSync(p);
export const defaultExistsSync = (/** @type {string} */ p) => existsSync(p);
export const defaultReadFile = (/** @type {string} */ p) => readFileSync(p, "utf8");
export const defaultStdoutWrite = (/** @type {string} */ s) => process.stdout.write(s);
export const defaultStderrWrite = (/** @type {string} */ s) => process.stderr.write(s);

/**
 * Does this folder directly contain a `route.ts` or `page.tsx`?
 * @param {string} dir
 * @param {{ readDir?: (p: string) => string[], statFile?: (p: string) => { isFile(): boolean } }} [j]
 * @returns {boolean}
 */
export function isSurfaceFolder(dir, j = {}) {
  const readDir = j.readDir ?? defaultReadDirSync;
  const statFile = j.statFile ?? defaultStatSync;
  let entries;
  try {
    entries = readDir(dir);
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (entry !== "route.ts" && entry !== "page.tsx") continue;
    try {
      if (statFile(join(dir, entry)).isFile()) return true;
    } catch {
      continue;
    }
  }
  return false;
}

/**
 * The `.md` and legacy `.yaml` manual files in `<folder>/__specs__/manual/`.
 * @param {string} folder
 * @param {{ existsSync?: (p: string) => boolean, readDir?: (p: string) => string[] }} [j]
 * @returns {{ md: string[], yaml: string[] }}
 */
export function manualFiles(folder, j = {}) {
  const exists = j.existsSync ?? defaultExistsSync;
  const readDir = j.readDir ?? defaultReadDirSync;
  const dir = join(folder, "__specs__", "manual");
  if (!exists(dir)) return { md: [], yaml: [] };
  let names;
  try {
    names = readDir(dir);
  } catch {
    return { md: [], yaml: [] };
  }
  return {
    md: names.filter((n) => n.endsWith(".md")).map((n) => join(dir, n)),
    yaml: names.filter((n) => n.endsWith(".yaml") || n.endsWith(".yml")).map((n) => join(dir, n)),
  };
}

/** Escape a literal for use in a RegExp. @param {string} s @returns {string} */
export function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validate one manual `.md`. Returns the list of problems (empty = pass).
 * @param {string} text raw markdown
 * @returns {string[]}
 */
export function checkFlowMd(text) {
  const problems = [];
  for (const h of REQUIRED_SECTIONS) {
    if (!new RegExp(`^${escapeRegExp(h)}\\s*$`, "m").test(text)) {
      problems.push(`missing section "${h}"`);
    }
  }
  if (!/must\s+not/i.test(text)) {
    problems.push('no "MUST NOT" assertion — a flow must state what must NOT happen (adversarial)');
  }
  if (!/\/api\/v1\/manual-results/.test(text)) {
    problems.push("Report section does not name the POST /api/v1/manual-results route");
  }
  return problems;
}

/**
 * Walk `appRoot`; check every surface folder for a compliant `.md` manual flow.
 * @param {string} appRoot
 * @param {{
 *   listDirs?: (root: string) => string[],
 *   readDir?: (p: string) => string[],
 *   statFile?: (p: string) => { isFile(): boolean },
 *   existsSync?: (p: string) => boolean,
 *   readFile?: (p: string) => string,
 * }} [j]
 * @returns {{ errors: string[], surfaces: number, flows: number }}
 */
export function audit(appRoot, j = {}) {
  const listDirs = j.listDirs ?? defaultListAllDirs;
  const readDir = j.readDir ?? defaultReadDirSync;
  const statFile = j.statFile ?? defaultStatSync;
  const exists = j.existsSync ?? defaultExistsSync;
  const readFile = j.readFile ?? defaultReadFile;

  /** @type {string[]} */
  const errors = [];
  let surfaces = 0;
  let flows = 0;

  for (const dir of listDirs(appRoot)) {
    if (!isSurfaceFolder(dir, { readDir, statFile })) continue;
    surfaces += 1;
    const rel = relative(ROOT_DIR, dir);
    const { md, yaml } = manualFiles(dir, { existsSync: exists, readDir });
    for (const y of yaml) {
      errors.push(`LEGACY_YAML ${relative(ROOT_DIR, y)} — migrate to a runnable .md flow`);
    }
    if (md.length === 0) {
      errors.push(`MISSING __specs__/manual/<flow>.md for ${rel} (a runnable adversarial flow is mandatory)`);
      continue;
    }
    for (const file of md) {
      flows += 1;
      const relFile = relative(ROOT_DIR, file);
      for (const p of checkFlowMd(readFile(file))) errors.push(`${relFile}: ${p}`);
    }
  }
  return { errors, surfaces, flows };
}

/**
 * @param {{ errors: string[], surfaces: number, flows: number }} r
 * @returns {{ exitCode: 0 | 1, stdout: string, stderr: string }}
 */
export function formatReport(r) {
  if (r.errors.length === 0) {
    return {
      exitCode: 0,
      stdout: `verify-manual-playbooks: OK (${String(r.surfaces)} surface(s) checked, ${String(r.flows)} runnable .md flow(s))\n`,
      stderr: "",
    };
  }
  const lines = [`verify-manual-playbooks: ${String(r.errors.length)} issue(s)`];
  for (const e of r.errors) lines.push(`  ${e}`);
  return { exitCode: 1, stdout: "", stderr: `${lines.join("\n")}\n` };
}

/**
 * @param {{
 *   app?: string,
 *   listDirs?: (root: string) => string[],
 *   readDir?: (p: string) => string[],
 *   statFile?: (p: string) => { isFile(): boolean },
 *   existsSync?: (p: string) => boolean,
 *   readFile?: (p: string) => string,
 *   write?: (s: string) => void,
 *   writeErr?: (s: string) => void,
 * }} [io]
 * @returns {{ exitCode: 0 | 1 }}
 */
export function main(io = {}) {
  const app = io.app ?? DEFAULT_APP;
  const write = io.write ?? defaultStdoutWrite;
  const writeErr = io.writeErr ?? defaultStderrWrite;
  const result = audit(app, {
    listDirs: io.listDirs,
    readDir: io.readDir,
    statFile: io.statFile,
    existsSync: io.existsSync,
    readFile: io.readFile,
  });
  const report = formatReport(result);
  if (report.stdout) write(report.stdout);
  if (report.stderr) writeErr(report.stderr);
  return { exitCode: report.exitCode };
}

/** @param {{ exit?: (code: number) => void }} [io] */
export function cliMain(io = {}) {
  const exit = io.exit ?? ((code) => process.exit(code));
  exit(main().exitCode);
}

/** @param {string} importMetaUrl @param {string | undefined} argv1 @returns {boolean} */
export function isCliInvocation(importMetaUrl, argv1) {
  if (argv1 === undefined || argv1 === "") return false;
  return importMetaUrl === pathToFileURL(argv1).href;
}

/** @param {{ importMetaUrl: string, argv1: string | undefined, exit?: (code: number) => void }} io @returns {boolean} */
export function maybeRunCli(io) {
  if (!isCliInvocation(io.importMetaUrl, io.argv1)) return false;
  cliMain({ exit: io.exit });
  return true;
}

maybeRunCli({ importMetaUrl: import.meta.url, argv1: process.argv[1] });
