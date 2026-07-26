#!/usr/bin/env node
// Setup-header verifier.
//
// Asserts the `SETUP FILE.` header is present on every file that owns
// architectural / bootstrap responsibilities.
//
// Convention-based. A file IS a setup file (must carry the header) IFF
// any of:
//   1. The filename is `types.ts` (pure interface-port files, regardless
//      of folder).
//   2. The file lives under a `schemas/` folder (Drizzle pure-DDL schema
//      definitions — the file IS the contract).
//   3. The file path matches one of the explicit globs in `SETUP_GLOBS`
//      below (concrete adapters, composition roots, seed CLIs, root
//      scaffolding, etc.).
//
// The verification is two-way:
//   - Every file matching the convention MUST carry the `SETUP FILE.` marker.
//   - Every file carrying the marker MUST match the convention (no rogue
//     files self-declaring as setup).
//
// Pure Node + zero external dependencies. Helpers are exported so the
// Vitest suite can exercise every branch without spawning the script.

import { readFileSync, existsSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { listAllFiles } from "../lib/walk.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const ROOT_DIR = resolve(SCRIPT_DIR, "..", "..");
const DEFAULT_SRC = resolve(ROOT_DIR, "src");

/**
 * Glob-style patterns (anchored at `src/`) that explicitly mark a file as
 * a setup file. This is the editable single source of truth — when a new
 * pattern joins the SETUP family, add it here, not as a hand-listed path.
 *
 * Pattern semantics: simple shell globs.
 *   - `*`     matches any run of characters except `/`
 *   - `**`    matches any run of characters including `/`
 *   - `**` + `/`  (a doublestar segment) matches zero-or-more directory
 *     segments — including the empty case
 *
 * @type {ReadonlyArray<string>}
 */
export const SETUP_GLOBS = [
  // Concrete infrastructure adapters
  "db/client/client.ts",
  "db/drizzle-scope/drizzle-scope.ts",
  "lib/clock/system/system-clock.ts",
  "lib/cloud-logging/google/google-cloud-logging-reader.ts",
  "lib/hashing/argon2/argon2-hasher.ts",
  "lib/logger/logger/logger.ts",
  "lib/logger/config/config.ts",
  "events/in-process/event-bus/event-bus.ts",
  "events/in-process/publisher/publisher.ts",
  "events/in-process/subscriber/subscriber.ts",

  // Composition root (one per module)
  "modules/*/composition-root.ts",

  // OpenAPI side-effect-import barrels. One file per
  // module exposes a module-public surface; one per sub-feature aggregates
  // its api-contract files. The route `src/app/api/v1/openapi.json/route.ts`
  // imports ONLY the module-level barrels — the sub-feature barrels keep
  // the chain narrow so the openapi.json endpoint never loads a
  // composition root (which would drag in real DB handles + repos +
  // services). Pure side-effect imports, zero exports, rarely edited.
  "modules/*/openapi-registrations.ts",
  "modules/*/*/openapi-registrations.ts",

  // Test harness (boots the in-memory test DB)
  "db/test/setup/setup.ts",
  "db/test/server-only-shim/server-only-shim.ts",
  "db/test/scenarios/scenarios.ts",
  "db/test/principals/principals.ts",

  // API plumbing — wire-shape contracts that rarely change
  "lib/api/result/result.ts",
  "lib/api/status-codes/status-codes.ts",

  // Root scaffolding — Next.js framework-required files
  "app/layout.tsx",
  "app/page.tsx",
  "middleware.ts",

  // Seed bootstrap — runs once during foundation seeding
  "db/seed/cli/cli.ts",
  "db/seed/cli/bootstrap.ts",
  "db/seed/cli/validate-cli.ts",
  "db/seed/cli/validate-bootstrap.ts",
  "db/seed/foundation-catalog/foundation-catalog.ts",
  "db/seed/foundation-principal/foundation-principal.ts",
  "db/seed/permissions/permissions.ts",
  "db/seed/roles/roles.ts",
  "db/seed/role-default-permissions/role-default-permissions.ts",
  "db/seed/service-principals/service-principals.ts",
  "db/seed/service-principal-roles/service-principal-roles.ts",

  // Setup bootstrap — single-command dev-DB bootstrap (`pnpm db:setup`).
  // `cli.ts` is the testable orchestrator; `bootstrap.ts` is the tiny
  // pnpm-script entry that triggers `cli.ts`'s `bootstrap` function.
  "db/setup/cli/cli.ts",
  "db/setup/cli/bootstrap.ts",

  // Reset bootstrap — single-command destructive dev-DB rebuild
  // (`pnpm db:reset`). Same shape as `db:setup` — `cli.ts` is the
  // testable orchestrator + guardrails, `bootstrap.ts` is the tiny
  // pnpm-script entry that triggers `cli.ts`'s `bootstrap` function.
  "db/reset/cli/cli.ts",
  "db/reset/cli/bootstrap.ts",

  // Lib-level config (env-var readers, dev-origin lists) — wired once
  "lib/config/**/*.ts",

  // Lib-level analytics primitives (gtag.js loader + measurement-id reader,
  //). Each new analytics destination lands a fresh `<Script>` tag
  // shape + env-var key, not a new code path — SETUP marker tracks edits.
  "lib/analytics/**/*.ts",
  "lib/analytics/**/*.tsx",

  // Lib-level admin-auth header-extraction helper. The
  // temp `X-Admin-Principal-Id` header model is closed-set wiring — every
  // edit lands a fresh header name / validation rule, not a new code path.
  // Will be stripped out entirely when cookie-session auth lands.
  "lib/admin-auth/**/*.ts",
];

/**
 * Compiled-once regexes for the SETUP_GLOBS list. See `globToRegex`.
 *
 * @type {ReadonlyArray<RegExp>}
 */
export const SETUP_REGEXES = SETUP_GLOBS.map(globToRegex);

/**
 * Default IO ports — broken out so the test suite can mark them
 * covered by calling them directly.
 */
export const defaultListAllFiles = (/** @type {string} */ p) => listAllFiles(p);
export const defaultReadFile = (/** @type {string} */ p) =>
  readFileSync(p, "utf8");
export const defaultExistsSync = (/** @type {string} */ p) => existsSync(p);
export const defaultStdoutWrite = (/** @type {string} */ s) =>
  process.stdout.write(s);
export const defaultStderrWrite = (/** @type {string} */ s) =>
  process.stderr.write(s);

/**
 * Convert a shell-style glob (anchored at src/) into a RegExp.
 *
 * Single-pass char walk so `**`, `*`, and the literal `**` + `/` form get
 * translated before regex metacharacters are escaped.
 *
 * @param {string} glob
 * @returns {RegExp}
 */
export function globToRegex(glob) {
  const META = ".+^${}()|[]\\";
  let out = "";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    const next = glob[i + 1];
    const next2 = glob[i + 2];
    if (c === "*" && next === "*" && next2 === "/") {
      // doublestar + slash -> any directory prefix, INCLUDING the empty
      // case (so `lib/config/**/*.ts` matches `lib/config/foo.ts` as well
      // as `lib/config/sub/foo.ts`).
      out += "(?:.*/)?";
      i += 3;
      continue;
    }
    if (c === "*" && next === "*") {
      // bare `**` (no trailing slash) -> any run of characters.
      out += ".*";
      i += 2;
      continue;
    }
    if (c === "*") {
      // single `*` -> any run except `/`.
      out += "[^/]*";
      i += 1;
      continue;
    }
    if (META.includes(c)) {
      out += "\\" + c;
    } else {
      out += c;
    }
    i += 1;
  }
  return new RegExp(`^${out}$`);
}

/**
 * Decide whether the file at `absolutePath` (inside `srcRoot`) is required
 * to carry the SETUP marker per the conventions documented at the top
 * of this script.
 *
 * @param {string} absolutePath
 * @param {string} srcRoot absolute path to the `src/` root
 * @returns {{ required: boolean, reason: string }}
 */
export function classify(absolutePath, srcRoot) {
  const rel = relative(srcRoot, absolutePath).split("\\").join("/");
  // String.split always returns ≥ 1 element, so .pop() is never undefined.
  // We assert the cast directly to keep coverage at 100/100.
  const parts = rel.split("/");
  const fileName = /** @type {string} */ (parts[parts.length - 1]);

  // Convention 1: types.ts files anywhere.
  if (fileName === "types.ts") {
    return { required: true, reason: "types.ts (interface port)" };
  }

  // Convention 2: any file directly under a `schemas/` folder (one or
  // two levels deep), excluding tests / __specs__ artifacts.
  if (
    /(^|\/)schemas\/[^/]+\/[^/]+\.ts$/.test(rel) ||
    /(^|\/)schemas\/[^/]+\.ts$/.test(rel)
  ) {
    if (rel.includes("/__tests__/") || rel.includes("/__specs__/")) {
      return { required: false, reason: "schemas test/specs artifact" };
    }
    return { required: true, reason: "Drizzle schema (pure DDL)" };
  }

  // Convention 3: explicit glob list.
  for (let i = 0; i < SETUP_REGEXES.length; i += 1) {
    if (SETUP_REGEXES[i].test(rel)) {
      return { required: true, reason: `glob ${SETUP_GLOBS[i]}` };
    }
  }

  return { required: false, reason: "" };
}

/**
 * Returns true when the supplied source's first ~30 lines contain the
 * `SETUP FILE.` marker. We look only at the very top of the file so a
 * body comment can't satisfy the gate.
 *
 * @param {string} source raw file contents
 * @returns {boolean}
 */
export function hasSetupHeader(source) {
  const head = source.split("\n").slice(0, 30).join("\n");
  return /SETUP FILE\./.test(head);
}

/**
 * True when the path is one of the file types this verifier scans.
 * Skips index barrels, declaration files, tests, and __specs__ /
 * __tests__ artifacts.
 *
 * @param {string} file absolute path
 * @returns {boolean}
 */
export function isCandidateSourceFile(file) {
  if (!file.endsWith(".ts") && !file.endsWith(".tsx")) return false;
  if (file.endsWith(".d.ts")) return false;
  if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) return false;
  if (file.includes("/__tests__/") || file.includes("/__specs__/")) return false;
  if (file.endsWith("/index.ts")) return false;
  return true;
}

/**
 * Walk `srcRoot` and check every candidate source file against the
 * setup-header contract.
 *
 * @param {string} srcRoot absolute path to `src/`
 * @param {{
 *   listFiles?: (root: string) => string[],
 *   readFile?: (p: string) => string,
 *   existsSync?: (p: string) => boolean,
 * }} [injected]
 * @returns {{
 *   errors: string[],
 *   checked: number,
 *   srcMissing: boolean,
 * }}
 */
export function audit(srcRoot, injected = {}) {
  const listFiles = injected.listFiles ?? defaultListAllFiles;
  const readFile = injected.readFile ?? defaultReadFile;
  const exists = injected.existsSync ?? defaultExistsSync;

  if (!exists(srcRoot)) {
    return { errors: [], checked: 0, srcMissing: true };
  }

  /** @type {string[]} */
  const errors = [];
  let checked = 0;

  for (const file of listFiles(srcRoot)) {
    if (!isCandidateSourceFile(file)) continue;

    const { required, reason } = classify(file, srcRoot);
    const source = readFile(file);
    const has = hasSetupHeader(source);

    if (required) {
      checked += 1;
      if (!has) {
        errors.push(
          `MISSING SETUP header: ${relative(ROOT_DIR, file)} (matched: ${reason})`,
        );
      }
    } else if (has) {
      errors.push(
        `UNEXPECTED SETUP header: ${relative(ROOT_DIR, file)} (file is not covered by any SETUP convention — either remove the marker or add a matching glob to SETUP_GLOBS)`,
      );
    }
  }

  return { errors, checked, srcMissing: false };
}

/**
 * Format the audit result for stdout / stderr.
 *
 * @param {{ errors: string[], checked: number, srcMissing: boolean }} result
 * @param {string} srcRoot absolute path to `src/` (used in the missing-root
 *   message)
 * @returns {{ exitCode: 0 | 1, stdout: string, stderr: string }}
 */
export function formatReport(result, srcRoot) {
  if (result.srcMissing) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: `verify-setup-headers: missing ${relative(ROOT_DIR, srcRoot)}\n`,
    };
  }
  if (result.errors.length === 0) {
    return {
      exitCode: 0,
      stdout: `verify-setup-headers: OK (${String(result.checked)} required setup file(s) checked)\n`,
      stderr: "",
    };
  }
  const lines = [
    `verify-setup-headers: ${String(result.errors.length)} issue(s)`,
  ];
  for (const e of result.errors) lines.push(`  ${e}`);
  return { exitCode: 1, stdout: "", stderr: `${lines.join("\n")}\n` };
}

/**
 * Entry point. Defaults to walking `src/` under the repo root.
 *
 * @param {{
 *   src?: string,
 *   listFiles?: (root: string) => string[],
 *   readFile?: (p: string) => string,
 *   existsSync?: (p: string) => boolean,
 *   write?: (s: string) => void,
 *   writeErr?: (s: string) => void,
 * }} [io]
 * @returns {{ exitCode: 0 | 1 }}
 */
export function main(io = {}) {
  const src = io.src ?? DEFAULT_SRC;
  const write = io.write ?? defaultStdoutWrite;
  const writeErr = io.writeErr ?? defaultStderrWrite;
  const result = audit(src, {
    listFiles: io.listFiles,
    readFile: io.readFile,
    existsSync: io.existsSync,
  });
  const report = formatReport(result, src);
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
 * Wrapped CLI dispatcher. Computes the guard predicate AND fires the CLI
 * body in one place — the function-call makes both branches reachable
 * from the test suite.
 *
 * @param {{
 *   importMetaUrl: string,
 *   argv1: string | undefined,
 *   exit?: (code: number) => void,
 * }} io
 * @returns {boolean} true when cliMain was invoked, false when the guard
 *   short-circuited
 */
export function maybeRunCli(io) {
  if (!isCliInvocation(io.importMetaUrl, io.argv1)) return false;
  cliMain({ exit: io.exit });
  return true;
}

// Module-load CLI gate. Imports during the test run see argv1 pointing
// at vitest, so `maybeRunCli` short-circuits.
maybeRunCli({ importMetaUrl: import.meta.url, argv1: process.argv[1] });
