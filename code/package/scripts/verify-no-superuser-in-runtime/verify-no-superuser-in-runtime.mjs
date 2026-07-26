#!/usr/bin/env node
// G-RULE0-A — superuser pool confined to migrations.
//
// Mechanical implementation of RULE 0 / verifier gate G-RULE0-A defined
// in `.claude/agents/verifier.md`. Walks every `.ts`
// file under `src/` and asserts that `getDbSuperuser` is imported ONLY
// from the two legitimate consumers:
//
//   1. `src/db/client.ts` — the function's own definition file
//   2. `src/db/migrate.ts` — the sole runtime consumer (DDL,
//      schema mutation only)
//
// Any other file that imports `getDbSuperuser` (or references it
// textually outside a comment) fails the verifier. The script is
// non-overridable per RULE 0's non-override clause — there is no
// `--allow-runtime-superuser` flag, no `// eslint-disable`-style
// escape, no environment override. The only way to relax this gate is
// to edit `.claude/standards/AUTHORIZATION_STANDARDS.yaml`
// `rule_0_permission_based_rls` AND `.claude/standards/STANDARDS_ENTRY.md`
// RULE 0 in a committed PR with explicit human review.
//
// Why this script exists:
//   - Cloud SQL Postgres' `postgres` role is `cloudsqlsuperuser`, not a
//     real PG superuser; FORCE ROW LEVEL SECURITY breaks the SECURITY
//     DEFINER `app_has_permission` resolver. We rely on Layer C — this
//     verifier gate — to keep the owner pool out of every runtime path.
//     Without this script, RULE 0 is documentation only.
//   - No runtime path may call `getDbSuperuser()` to dodge the GUC / RLS
//     interaction. This gate ensures code does not paste that pattern.
//
// Allowed paths (regex matches the file path, joined with `/`):
//   - `^src/db/client\.ts$`
//   - `^src/db/migrate\.ts$`
//   - `^src/.*/__tests__/`  — tests legitimately import the superuser
//     pool to seed pglite or assert behavior of the function itself
//
// Anything else with `getDbSuperuser` triggers a violation. Comment-
// only mentions are filtered (the script ignores lines that start with
// `//` or `*` after leading whitespace, OR live inside a `/* ... */`
// block) so `.md`-style discussion in JSDoc isn't a false positive.
//
// Pure Node + zero external dependencies. Helpers are exported so a
// Vitest suite can exercise every branch without spawning a child
// process.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const ROOT_DIR = resolve(SCRIPT_DIR, "..", "..");

/**
 * The symbol we're guarding against. Match anywhere in the file body —
 * imports, type references, identifier mentions in code. Comments are
 * filtered out separately.
 */
const FORBIDDEN_SYMBOL = "getDbSuperuser";

/**
 * File paths (relative to the app root (code/web), forward-slash-normalised) that
 * ARE allowed to reference `getDbSuperuser`. Anything else is a
 * violation.
 */
const ALLOWED_PATH_PATTERNS = [
  /^src\/db\/client\.ts$/,
  /^src\/db\/migrate\.ts$/,
  /^src\/.*\/__tests__\//,
];

/**
 * Allowlist of known violations under active migration. Each entry MUST
 * cite the follow-up issue whose deliverable removes the reference. The
 * gate is non-overridable for new violations — every new entry here
 * requires changing this file in a committed PR with explicit human
 * review, NOT a runtime
 * override.
 *
 * Normally empty: no runtime path may call `getDbSuperuser`. The gate
 * fires on any runtime call outside the allowed migration-only paths.
 */
const KNOWN_VIOLATIONS = [];

/**
 * Walks `dir` recursively and returns every `.ts` file path (absolute).
 *
 * @param {string} dir Absolute directory path.
 * @returns {string[]} Absolute file paths.
 */
export function collectTypeScriptFiles(dir) {
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
        if (entry === "node_modules" || entry === ".next" || entry === "dist") {
          continue;
        }
        stack.push(full);
      } else if (stats.isFile() && entry.endsWith(".ts")) {
        result.push(full);
      }
    }
  }
  return result;
}

/**
 * Returns true if `relativePath` (relative to the app root (code/web),
 * forward-slash-normalised) matches any allowed pattern.
 *
 * @param {string} relativePath
 * @returns {boolean}
 */
export function isAllowedPath(relativePath) {
  return ALLOWED_PATH_PATTERNS.some((re) => re.test(relativePath));
}

/**
 * Returns the line numbers (1-indexed) in `content` that reference
 * `FORBIDDEN_SYMBOL` outside of comments. Single-line `//` comments
 * and `/* ... *​/` blocks are skipped. Lines inside template strings
 * are NOT distinguished (the symbol shouldn't appear inside template
 * strings either — that would be the very smuggling we guard against).
 *
 * @param {string} content
 * @returns {number[]}
 */
export function findViolationLines(content) {
  const lines = content.split("\n");
  let inBlockComment = false;
  const violations = [];
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    let code = raw;
    if (inBlockComment) {
      const closeIdx = code.indexOf("*/");
      if (closeIdx === -1) {
        continue;
      }
      code = code.slice(closeIdx + 2);
      inBlockComment = false;
    }
    while (true) {
      const openIdx = code.indexOf("/*");
      if (openIdx === -1) break;
      const closeIdx = code.indexOf("*/", openIdx + 2);
      if (closeIdx === -1) {
        inBlockComment = true;
        code = code.slice(0, openIdx);
        break;
      }
      code = code.slice(0, openIdx) + code.slice(closeIdx + 2);
    }
    const lineCommentIdx = code.indexOf("//");
    if (lineCommentIdx !== -1) {
      code = code.slice(0, lineCommentIdx);
    }
    if (code.includes(FORBIDDEN_SYMBOL)) {
      violations.push(i + 1);
    }
  }
  return violations;
}

/**
 * Audits the given file. Returns one of three states:
 *  - `null` — clean (no references, OR references but path is allowed).
 *  - `{ kind: "violation", ... }` — fails the gate.
 *  - `{ kind: "known", ... }` — referenced and present in the
 *     grandfathered KNOWN_VIOLATIONS list; passes the gate but the
 *     allowlist entry stays in scope.
 *
 * @param {string} absolutePath
 * @param {string} rootDir Absolute server/ root.
 * @returns {{kind: "violation", path: string, lines: number[]} | {kind: "known", path: string, lines: number[]} | null}
 */
export function auditFile(absolutePath, rootDir) {
  const rel = relative(rootDir, absolutePath).split(sep).join("/");
  if (isAllowedPath(rel)) {
    return null;
  }
  let content;
  try {
    content = readFileSync(absolutePath, "utf8");
  } catch {
    return null;
  }
  const lines = findViolationLines(content);
  if (lines.length === 0) {
    return null;
  }
  const known = KNOWN_VIOLATIONS.find((k) => k.path === rel);
  if (known) {
    return { kind: "known", path: rel, lines };
  }
  return { kind: "violation", path: rel, lines };
}

/**
 * The error message the script emits per violation.
 */
const VIOLATION_MESSAGE_PREFIX =
  "G-RULE0-A violation: getDbSuperuser() referenced outside the allowed paths.";

/**
 * Main entry — runs the audit, prints a report, returns the exit code.
 *
 * @param {string} rootDir Absolute server/ root (defaults to the
 *   discovered repo root from this script's location).
 * @returns {number} 0 when no violations; 1 when any.
 */
export function runAudit(rootDir = ROOT_DIR) {
  const srcDir = join(rootDir, "src");
  const files = collectTypeScriptFiles(srcDir);
  const violations = [];
  const knownStillPresent = new Set();
  for (const f of files) {
    const result = auditFile(f, rootDir);
    if (!result) continue;
    if (result.kind === "violation") {
      violations.push(result);
    } else if (result.kind === "known") {
      knownStillPresent.add(result.path);
    }
  }
  const staleAllowlist = KNOWN_VIOLATIONS.filter(
    (k) => !knownStillPresent.has(k.path),
  );
  if (violations.length === 0 && staleAllowlist.length === 0) {
    if (knownStillPresent.size > 0) {
      process.stdout.write(
        `[verify-no-superuser-in-runtime] PASS — no new violations. ${knownStillPresent.size} grandfathered entries still present:\n`,
      );
      for (const k of KNOWN_VIOLATIONS) {
        process.stdout.write(`  - ${k.path} (${k.ticket})\n`);
      }
      process.stdout.write(
        "Remove each entry from KNOWN_VIOLATIONS as the corresponding refactor lands.\n",
      );
    } else {
      process.stdout.write(
        "[verify-no-superuser-in-runtime] PASS — no `getDbSuperuser` references outside the allow-list.\n",
      );
    }
    return 0;
  }
  if (violations.length > 0) {
    process.stderr.write(`${VIOLATION_MESSAGE_PREFIX}\n`);
    process.stderr.write(
      "Allowed paths: `src/db/client.ts`, `src/db/migrate.ts`, `src/**/__tests__/**`.\n",
    );
    process.stderr.write("New violations (NOT in the grandfathered allowlist):\n");
    for (const v of violations) {
      process.stderr.write(`  ${v.path}: line(s) ${v.lines.join(", ")}\n`);
    }
    process.stderr.write(
      "\nRule reference: `.claude/standards/STANDARDS_ENTRY.md` RULE 0 + `.claude/standards/AUTHORIZATION_STANDARDS.yaml` `rule_0_permission_based_rls`.\n",
    );
    process.stderr.write(
      "This gate is non-overridable. The fix is to remove the runtime-superuser call, not to relax the gate.\n",
    );
  }
  if (staleAllowlist.length > 0) {
    process.stderr.write(
      "\nStale allowlist entries (file no longer references `getDbSuperuser`; remove from KNOWN_VIOLATIONS):\n",
    );
    for (const k of staleAllowlist) {
      process.stderr.write(`  ${k.path}\n`);
    }
  }
  return 1;
}

const isDirectInvocation =
  import.meta.url === pathToFileURL(process.argv[1] ?? "").href;

if (isDirectInvocation) {
  process.exit(runAudit());
}

// Exports for the Vitest suite. The `_constants` bundle is exposed so
// tests can assert the allow-list shape without re-deriving it.
export const _constants = {
  FORBIDDEN_SYMBOL,
  ALLOWED_PATH_PATTERNS,
  KNOWN_VIOLATIONS,
  VIOLATION_MESSAGE_PREFIX,
};
