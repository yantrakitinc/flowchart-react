#!/usr/bin/env node
// G-CLIENT-SERVER-BOUNDARY — client modules never reach server-only code.
//
// A YK service is ONE Next.js app at `code/web/`; "server" and "client" are
// LAYERS, not packages. A module enters the CLIENT bundle when it sits in the
// import-closure of any `"use client"` entry. Server-only modules — the DB
// client + RLS bridge (`src/db/*`), repositories, and per-feature
// `services/` + `handlers/` — plus any module that imports the `server-only`
// package, MUST NOT appear in that closure. If they do, server code / secrets
// ship to the browser and RULE 0's server-side authorization becomes
// bypassable.
//
// The ALLOWED client→server bridge is a Server Action (`actions/*.action.ts`,
// `"use server"`) or a route handler called over HTTP — never a direct import
// of the data / service / handler layer.
//
// This gate is non-overridable per RULE 0's non-override clause. Pure Node +
// zero dependencies; helpers are exported so a Vitest suite can drive every
// branch without spawning a child process.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const ROOT_DIR = resolve(SCRIPT_DIR, "..", "..");

const VIOLATION_MESSAGE_PREFIX =
  "G-CLIENT-SERVER-BOUNDARY violation: server-only code is reachable from a client (`\"use client\"`) module.";

/** Path (relative to src/, forward-slashed) of a server-only LAYER. */
export function isServerOnlyLayerPath(relFromSrc) {
  const p = relFromSrc.split(sep).join("/");
  if (/^db\//.test(p)) return true; // DB client + RLS bridge + migrations
  if (/(^|\/)repositories\//.test(p)) return true; // repositories anywhere
  if (/^features\/[^/]+\/(services|handlers)\//.test(p)) return true; // feature server logic
  return false;
}

const IMPORT_SPECIFIER_RE = /(?:from|import|require)\s*\(?\s*["']([^"']+)["']/g;
const USE_CLIENT_RE = /^\s*["']use client["']\s*;?\s*$/;
const SERVER_ONLY_IMPORT_RE = /["'](server-only|server-cli-only)["']/;

/** Recursively collect every .ts/.tsx file under `dir`. */
export function collectFiles(dir) {
  const result = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = readdirSync(current);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(current, entry);
      let stats;
      try {
        stats = statSync(full);
      } catch {
        continue;
      }
      if (stats.isDirectory()) {
        if (["node_modules", ".next", "dist", "build"].includes(entry)) continue;
        stack.push(full);
      } else if (stats.isFile() && (entry.endsWith(".ts") || entry.endsWith(".tsx"))) {
        result.push(full);
      }
    }
  }
  return result;
}

/** Resolve a local import specifier to an absolute file path, or null for bare/external. */
export function resolveSpecifier(specifier, fromDir, srcDir) {
  let base;
  if (specifier.startsWith("@/")) base = join(srcDir, specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(fromDir, specifier);
  else return null; // bare package, node:, server-only, etc.
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];
  for (const c of candidates) {
    try {
      if (existsSync(c) && statSync(c).isFile()) return c;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Parse one file into { useClient, serverOnlyImport, imports[] (raw specifiers) }. */
export function parseModule(content) {
  const lines = content.split("\n");
  let useClient = false;
  // "use client" must be the first statement (allow leading comments/blank lines).
  for (const line of lines) {
    const t = line.trim();
    if (t === "" || t.startsWith("//") || t.startsWith("/*") || t.startsWith("*")) continue;
    if (USE_CLIENT_RE.test(line)) useClient = true;
    break;
  }
  const serverOnlyImport = SERVER_ONLY_IMPORT_RE.test(content);
  const imports = [];
  for (const line of lines) {
    const codeIdx = line.indexOf("//");
    const code = codeIdx === -1 ? line : line.slice(0, codeIdx);
    IMPORT_SPECIFIER_RE.lastIndex = 0;
    let m;
    while ((m = IMPORT_SPECIFIER_RE.exec(code)) !== null) imports.push(m[1]);
  }
  return { useClient, serverOnlyImport, imports };
}

/**
 * Build the client import-closure and flag any server-only module inside it.
 * @returns {{ entry: string, serverModule: string }[]} violations (src-relative paths)
 */
export function findViolations(srcDir) {
  const files = collectFiles(srcDir);
  const mods = new Map(); // abs -> parsed
  for (const f of files) {
    try {
      mods.set(f, parseModule(readFileSync(f, "utf8")));
    } catch {
      /* unreadable -> skip */
    }
  }
  const relSrc = (abs) => relative(srcDir, abs).split(sep).join("/");
  const isServerOnly = (abs) =>
    mods.get(abs)?.serverOnlyImport === true || isServerOnlyLayerPath(relSrc(abs));

  const violations = [];
  for (const [abs, parsed] of mods) {
    if (!parsed.useClient) continue;
    // BFS the closure from this client entry.
    const seen = new Set([abs]);
    const stack = [abs];
    while (stack.length > 0) {
      const cur = stack.pop();
      const curParsed = mods.get(cur);
      if (!curParsed) continue;
      for (const spec of curParsed.imports) {
        const target = resolveSpecifier(spec, dirname(cur), srcDir);
        if (!target || seen.has(target)) continue;
        seen.add(target);
        if (isServerOnly(target)) {
          violations.push({ entry: relSrc(abs), serverModule: relSrc(target) });
          continue; // don't traverse into server-only code from here
        }
        stack.push(target);
      }
    }
  }
  return violations;
}

/** Main entry — audits `<rootDir>/src` and returns the exit code. */
export function runAudit(rootDir = ROOT_DIR) {
  const srcDir = join(rootDir, "src");
  if (!existsSync(srcDir)) {
    process.stdout.write("[verify-no-server-imports] PASS — no src/ in this repo.\n");
    return 0;
  }
  const violations = findViolations(srcDir);
  if (violations.length === 0) {
    process.stdout.write(
      "[verify-no-server-imports] PASS — no server-only module is reachable from a `\"use client\"` entry.\n",
    );
    return 0;
  }
  process.stderr.write(`${VIOLATION_MESSAGE_PREFIX}\n`);
  process.stderr.write(
    "The client→server bridge is a Server Action (`actions/*.action.ts`) or an HTTP route handler — not a direct import of src/db, repositories, services, or handlers.\n\nViolations:\n",
  );
  for (const v of violations) {
    process.stderr.write(`  client \`${v.entry}\` reaches server-only \`${v.serverModule}\`\n`);
  }
  process.stderr.write(
    "\nRule: PROJECT_ARCHITECTURE.yaml `single_app_shape` (RSC server/client boundary). Non-overridable.\n",
  );
  return 1;
}

export function isCliInvocation(importMetaUrl, argv1) {
  if (argv1 === undefined || argv1 === "") return false;
  return importMetaUrl === pathToFileURL(argv1).href;
}

export function maybeRunCli(io) {
  if (!isCliInvocation(io.importMetaUrl, io.argv1)) return false;
  const exit = io.exit ?? ((code) => process.exit(code));
  const audit = io.runAudit ?? runAudit;
  exit(audit());
  return true;
}

maybeRunCli({ importMetaUrl: import.meta.url, argv1: process.argv[1] });

export const _constants = { VIOLATION_MESSAGE_PREFIX };
