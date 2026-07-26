#!/usr/bin/env node
/**
 * verify-no-theater-tests.mjs
 *
 * Detects coverage-without-behavior test patterns ("theater tests"):
 *
 *   PATTERN_TRIVIAL_TRUE     `expect(true).toBe(true)` / `expect(1).toBe(1)`
 *   PATTERN_NEGATIVE_NO_OP   `expect(...).not.toThrow()` with no other expect()
 *                            in the same `it(...)` block — asserts only that
 *                            something didn't throw, never asserts behavior
 *   PATTERN_EMPTY_IT         `it("...", () => {})` — passes by doing nothing
 *
 * Pure Node + zero external deps. Helpers exported for vitest coverage.
 *
 * Usage:
 *   node verify-no-theater-tests.mjs [<src-root>]   default: "src"
 *
 * Exit: 0 if clean; 1 if any theater pattern found.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const SOURCE_ROOT = process.argv[2] || "src";
const REPO_ROOT = process.cwd();
const absRoot = join(REPO_ROOT, SOURCE_ROOT);

const SKIP_DIRS = new Set([
  "node_modules", ".next", ".turbo", "dist", "build", "out", ".git",
  "coverage", "test-results", "playwright-report",
]);

const TEST_FILE_RE = /\.(?:test|spec)\.(?:ts|tsx|js|jsx|mts|mjs)$/;

const PATTERN_TRIVIAL_TRUE  = /expect\(\s*(true|false|1|0|null|undefined|""|''|`\s*`)\s*\)\.toBe\(\s*\1\s*\)/g;
const PATTERN_EMPTY_IT      = /\b(?:it|test)\s*\(\s*['"`][^'"`]+['"`]\s*,\s*(?:async\s*)?\(\s*\)\s*=>\s*\{\s*\}\s*\)/g;

/**
 * Splits the source into approximate it/test block bodies for the
 * negative-no-op check. Returns array of { name, body }. Bodies are
 * matched by counting brace depth from the opening `it(` arrow.
 *
 * Crude regex-based parser (zero-dep); known to miss it() blocks that
 * use weird formatting. The other two patterns are line-scoped so
 * they catch what this misses.
 *
 * @param {string} src
 * @returns {Array<{ name: string, body: string }>}
 */
export function extractItBlocks(src) {
  const out = [];
  const re = /\b(?:it|test)\s*\(\s*(['"`])([^'"`]+)\1\s*,\s*(?:async\s*)?\(\s*\)\s*=>\s*\{/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[2];
    const bodyStart = re.lastIndex;
    let depth = 1;
    let i = bodyStart;
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      i++;
    }
    if (depth === 0) out.push({ name, body: src.slice(bodyStart, i - 1) });
  }
  return out;
}

/**
 * @param {string} blockBody  the body of an it/test arrow function
 * @returns {boolean}         true if the block only asserts via
 *                            `expect(...).not.toThrow()` with no other
 *                            specific `expect(...).toX(...)`
 */
export function isNegativeNoOpBlock(blockBody) {
  const allExpects = blockBody.match(/expect\(/g) ?? [];
  if (allExpects.length === 0) return false;
  // count specific (positive or specific-negative) expectations
  const specific = blockBody.match(/expect\([^)]*\)\.(?!not\.toThrow\b)[a-zA-Z]+\(/g) ?? [];
  if (specific.length > 0) return false;
  // every expect is a negative-no-op
  return blockBody.includes(".not.toThrow(");
}

/**
 * Scans a source string + returns list of theater hits for that file.
 *
 * @param {string} src
 * @returns {Array<{ line: number, pattern: string, snippet: string }>}
 */
export function scanSource(src) {
  const hits = [];
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (PATTERN_TRIVIAL_TRUE.test(line)) hits.push({ line: i + 1, pattern: "trivial-true", snippet: line.trim() });
    PATTERN_TRIVIAL_TRUE.lastIndex = 0;
    if (PATTERN_EMPTY_IT.test(line))     hits.push({ line: i + 1, pattern: "empty-it", snippet: line.trim() });
    PATTERN_EMPTY_IT.lastIndex = 0;
  }
  const blocks = extractItBlocks(src);
  for (const { name, body } of blocks) {
    if (isNegativeNoOpBlock(body)) {
      const lineIdx = src.slice(0, src.indexOf(body)).split("\n").length;
      hits.push({ line: lineIdx, pattern: "negative-no-op", snippet: `it("${name}", …) — only assertion is .not.toThrow()` });
    }
  }
  return hits;
}

function isCli() {
  return import.meta.url === `file://${process.argv[1]}`;
}

const violations = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(join(dir, entry.name));
      continue;
    }
    if (!TEST_FILE_RE.test(entry.name)) continue;
    const file = join(dir, entry.name);
    let src;
    try { src = readFileSync(file, "utf8"); } catch { continue; }
    const hits = scanSource(src);
    for (const h of hits) violations.push({ file: relative(REPO_ROOT, file), ...h });
  }
}

if (isCli()) {
  if (!existsSync(absRoot)) {
    process.stdout.write(`✅ verify-no-theater-tests — no ${SOURCE_ROOT}/ in this repo; nothing to check.\n`);
    process.exit(0);
  }
  walk(absRoot);
  if (violations.length === 0) {
    process.stdout.write(`✅ verify-no-theater-tests — no theater patterns found in ${SOURCE_ROOT}/.\n`);
    process.exit(0);
  }
  process.stderr.write(`❌ verify-no-theater-tests: ${violations.length} theater test pattern(s)\n\n`);
  for (const v of violations) {
    process.stderr.write(`  ${v.file}:${v.line} [${v.pattern}]\n     ${v.snippet}\n`);
  }
  process.stderr.write(
    `\nReplace with specific assertions:\n` +
    `  trivial-true     → assert a fact the code under test produces\n` +
    `  empty-it         → write the test body, or delete the test\n` +
    `  negative-no-op   → assert the specific shape / value, not just "didn't throw"\n`,
  );
  process.exit(1);
}
