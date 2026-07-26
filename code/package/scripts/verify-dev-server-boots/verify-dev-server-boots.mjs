#!/usr/bin/env node
/**
 * verify-dev-server-boots.mjs
 *
 * Spawns the project's `pnpm dev` (or equivalent) and asserts:
 *   1. an HTTP request to the configured dev URL returns 2xx/3xx within
 *      DEV_BOOT_TIMEOUT_MS (default 30s);
 *   2. stdout/stderr contain no error-level log lines during the boot
 *      window.
 *
 * Catches "compiles fine, app doesn't actually start" — missing env
 * vars, port collisions, missing migrations, broken composition roots.
 *
 * Heavy gate (boots a real process). Runs only in `pnpm verify:full`,
 * not in the default chain.
 *
 * Pure Node + zero external deps. Helpers exported for vitest coverage.
 *
 * Configuration (README.yaml):
 *   - ui_screenshot_dev_server_url (default "http://localhost:3000") —
 *     reused; this is the same dev server.
 *   - dev_boot_timeout_ms (default 30000)
 *   - dev_boot_script (default "dev") — the package.json scripts key
 *
 * Exit:
 *   0  dev server reached 2xx/3xx within timeout + no error lines
 *   1  server didn't respond OR error-line detected in stdout/stderr
 *   2  BLOCKED — pnpm not on PATH OR no dev script declared
 */

import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";
import { createRequire } from "node:module";
import { dirname } from "node:path";

const REPO_ROOT = process.cwd();
const require = createRequire(import.meta.url);

let YAML;
try { YAML = require("yaml"); } catch { /* optional */ }

// README.yaml lives at the git repo root, which may be ABOVE the package dir
// (these repos run gates from code/web while README.yaml sits two levels up).
// Walk up from cwd until we find it.
function findReadme() {
  let dir = REPO_ROOT;
  for (let i = 0; i < 6; i++) {
    const p = `${dir}/README.yaml`;
    if (existsSync(p)) return p;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function readRepoConfig() {
  const readmePath = findReadme();
  if (!readmePath || !YAML) return {};
  try { return YAML.parse(readFileSync(readmePath, "utf8")) ?? {}; }
  catch { return {}; }
}

const repoConfig = readRepoConfig();
const DEV_URL = String(repoConfig.ui_screenshot_dev_server_url ?? "http://localhost:3000");
const TIMEOUT_MS = Number(repoConfig.dev_boot_timeout_ms ?? 30000);
const DEV_SCRIPT = String(repoConfig.dev_boot_script ?? "dev");

const ERROR_LINE_RE = /\b(?:error|fatal|uncaught|UnhandledPromiseRejection|Cannot find module|EADDRINUSE|ECONNREFUSED|TypeError|ReferenceError)\b/i;

/**
 * Polls `url` every 250ms until it returns a 2xx/3xx OR `timeoutMs`
 * elapses. Resolves with { ok, status, ms } on success or false on
 * timeout.
 *
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<{ ok: boolean, status: number | null, ms: number }>}
 */
export async function pollHttp(url, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const resp = await fetch(url, { redirect: "manual" });
      if (resp.status >= 200 && resp.status < 400) {
        return { ok: true, status: resp.status, ms: Date.now() - startedAt };
      }
    } catch { /* not up yet */ }
    await wait(250);
  }
  return { ok: false, status: null, ms: Date.now() - startedAt };
}

/**
 * Scans a captured stdout/stderr blob for error-level log lines.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function findErrorLines(text) {
  return text.split("\n").filter((line) => ERROR_LINE_RE.test(line));
}

function hasDevScript(repoRoot, scriptName) {
  const candidates = [
    `${repoRoot}/package.json`,
    `${repoRoot}/code/web/package.json`,
    `${repoRoot}/code/package.json`,
    `${repoRoot}/web/package.json`,
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      const pkg = JSON.parse(readFileSync(p, "utf8"));
      if (pkg.scripts && pkg.scripts[scriptName]) return p;
    } catch { /* skip */ }
  }
  return null;
}

async function main() {
  // dependency check
  const pnpmCheck = spawn("pnpm", ["--version"], { stdio: "ignore" });
  await new Promise((res) => pnpmCheck.on("close", res));
  if (pnpmCheck.exitCode !== 0) {
    process.stderr.write(
      `🚧 verify-dev-server-boots: BLOCKED — pnpm not on PATH. Install pnpm or run from a shell with it.\n`,
    );
    process.exit(2);
  }
  const pkgPath = hasDevScript(REPO_ROOT, DEV_SCRIPT);
  if (!pkgPath) {
    process.stderr.write(
      `🚧 verify-dev-server-boots: BLOCKED — no package.json declares a "${DEV_SCRIPT}" script. ` +
      `Set README.yaml.dev_boot_script if your script has a different name.\n`,
    );
    process.exit(2);
  }

  const cwd = pkgPath.replace(/\/package\.json$/, "");
  const child = spawn("pnpm", ["run", DEV_SCRIPT], { cwd, stdio: ["ignore", "pipe", "pipe"] });
  let stdoutBuf = "";
  let stderrBuf = "";
  child.stdout.on("data", (b) => { stdoutBuf += b.toString(); });
  child.stderr.on("data", (b) => { stderrBuf += b.toString(); });

  let httpResult;
  try {
    httpResult = await pollHttp(DEV_URL, TIMEOUT_MS);
  } finally {
    child.kill("SIGTERM");
    await new Promise((res) => child.on("close", res));
  }

  const errorLines = findErrorLines(stdoutBuf + stderrBuf);

  if (!httpResult.ok) {
    process.stderr.write(
      `❌ verify-dev-server-boots: dev server did not respond at ${DEV_URL} within ${TIMEOUT_MS}ms\n\n`,
    );
    if (errorLines.length > 0) {
      process.stderr.write(`  Error lines from server output:\n`);
      for (const l of errorLines.slice(0, 20)) process.stderr.write(`    ${l}\n`);
    } else {
      process.stderr.write(`  Last 20 stdout lines:\n`);
      for (const l of stdoutBuf.split("\n").slice(-20)) process.stderr.write(`    ${l}\n`);
    }
    process.exit(1);
  }
  if (errorLines.length > 0) {
    process.stderr.write(
      `❌ verify-dev-server-boots: dev server responded ${httpResult.status} at ${DEV_URL} in ${httpResult.ms}ms, ` +
      `but ${errorLines.length} error line(s) detected in stdout/stderr\n\n`,
    );
    for (const l of errorLines.slice(0, 20)) process.stderr.write(`  ${l}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `✅ verify-dev-server-boots — ${DEV_URL} returned ${httpResult.status} in ${httpResult.ms}ms; no errors in stdout.\n`,
  );
  process.exit(0);
}

function isCli() {
  return import.meta.url === `file://${process.argv[1]}`;
}

if (isCli()) {
  main().catch((e) => {
    process.stderr.write(`💥 verify-dev-server-boots: unexpected error — ${e.message}\n`);
    process.exit(2);
  });
}
