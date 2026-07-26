#!/usr/bin/env node
/**
 * verify-no-cross-feature-imports.mjs
 *
 * Refuses any `src/features/<A>/...` file from importing internals of
 * another feature. Allowed cross-feature import shapes:
 *   - import from `<...>/features/<B>/index` or `<...>/features/<B>`
 *     (the public surface — feature B's barrel file)
 * Refused shapes:
 *   - import from `<...>/features/<B>/anything-else`
 *
 * Each feature is supposed to be self-contained; reaching into another
 * feature's internals couples them at the implementation, not the API.
 * G-FRONTEND-BOUNDARY's cousin (FE never imports BE) but feature-to-
 * feature scoped.
 *
 * Pure Node + zero external deps. Helpers exported for vitest coverage.
 *
 * Usage:
 *   node verify-no-cross-feature-imports.mjs [<src-root>]   default: "src"
 *
 * Exit: 0 if clean; 1 if any cross-feature internals import found.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, normalize } from "node:path";

const SOURCE_ROOT = process.argv[2] || "src";
const REPO_ROOT = process.cwd();
const absRoot = join(REPO_ROOT, SOURCE_ROOT);
const FEATURES_DIR = join(absRoot, "features");

const SKIP_DIRS = new Set([
  "node_modules", ".next", ".turbo", "dist", "build", "out", ".git",
  "coverage", "test-results", "playwright-report",
]);

const SCANNABLE_EXTS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs"]);

/**
 * Extracts every relative import specifier (those starting with `.`)
 * from a TS/JS source string. Strips // line comments first.
 *
 * @param {string} src
 * @returns {string[]}
 */
export function extractRelativeSpecifiers(src) {
  const stripped = src.split("\n").map((l) => l.replace(/(?<!:)\/\/.*$/, "")).join("\n");
  const re = /(?:from|import|require)\s*\(?\s*["'](\.\.?\/[^"']+)["']/g;
  const out = new Set();
  let m;
  while ((m = re.exec(stripped)) !== null) out.add(m[1]);
  return [...out];
}

/**
 * Maps a (sourceFile, relativeSpecifier) pair to a normalized absolute
 * path. Strips any trailing `/index` plus extension so the gate's match
 * can compare to the feature root directory.
 *
 * @param {string} sourceFile
 * @param {string} spec
 * @returns {string}
 */
export function resolveImportTarget(sourceFile, spec) {
  const abs = normalize(resolve(dirname(sourceFile), spec));
  return abs.replace(/\.(?:ts|tsx|mts|cts|js|jsx|mjs)$/, "").replace(/\/index$/, "");
}

/**
 * Given an absolute path, returns the feature name (the slug between
 * `features/` and the next `/`) or null when the path is not under any
 * feature folder.
 *
 * @param {string} absPath
 * @param {string} featuresRoot
 * @returns {string | null}
 */
export function featureNameFor(absPath, featuresRoot) {
  const prefix = featuresRoot.endsWith("/") ? featuresRoot : featuresRoot + "/";
  if (!absPath.startsWith(prefix)) return null;
  const rest = absPath.slice(prefix.length);
  const slash = rest.indexOf("/");
  return slash === -1 ? rest : rest.slice(0, slash);
}

/**
 * Decides whether (sourceFeature, importedAbsPath) is an allowed cross-
 * feature import (target is the public surface — feature root) vs a
 * violation (target reaches into internals).
 *
 * @param {string} sourceFeature
 * @param {string} importedAbsPath
 * @param {string} featuresRoot
 * @returns {{ kind: "same-feature"|"public-surface"|"internals", targetFeature: string | null }}
 */
export function classifyCrossFeatureImport(sourceFeature, importedAbsPath, featuresRoot) {
  const targetFeature = featureNameFor(importedAbsPath, featuresRoot);
  if (targetFeature === null) return { kind: "same-feature", targetFeature: null };  // not into another feature
  if (targetFeature === sourceFeature) return { kind: "same-feature", targetFeature };
  const prefix = featuresRoot.endsWith("/") ? featuresRoot : featuresRoot + "/";
  const expectedRoot = prefix + targetFeature;
  if (importedAbsPath === expectedRoot) return { kind: "public-surface", targetFeature };
  return { kind: "internals", targetFeature };
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
    const idx = entry.name.lastIndexOf(".");
    if (idx === -1) continue;
    if (!SCANNABLE_EXTS.has(entry.name.slice(idx))) continue;
    if (entry.name.endsWith(".d.ts")) continue;
    const file = join(dir, entry.name);
    const sourceFeature = featureNameFor(file, FEATURES_DIR);
    if (sourceFeature === null) continue;     // file outside features/
    let src;
    try { src = readFileSync(file, "utf8"); } catch { continue; }
    const specs = extractRelativeSpecifiers(src);
    for (const spec of specs) {
      const target = resolveImportTarget(file, spec);
      const cls = classifyCrossFeatureImport(sourceFeature, target, FEATURES_DIR);
      if (cls.kind === "internals") {
        violations.push({
          file: relative(REPO_ROOT, file),
          specifier: spec,
          sourceFeature,
          targetFeature: cls.targetFeature,
          allowed: `import from ${SOURCE_ROOT}/features/${cls.targetFeature} (its index.ts barrel) instead`,
        });
      }
    }
  }
}

if (isCli()) {
  if (!existsSync(absRoot)) {
    process.stdout.write(`✅ verify-no-cross-feature-imports — no ${SOURCE_ROOT}/ in this repo; nothing to check.\n`);
    process.exit(0);
  }
  if (!existsSync(FEATURES_DIR)) {
    process.stdout.write(`✅ verify-no-cross-feature-imports — no ${SOURCE_ROOT}/features/ folder; nothing to check.\n`);
    process.exit(0);
  }
  walk(FEATURES_DIR);
  if (violations.length === 0) {
    process.stdout.write(`✅ verify-no-cross-feature-imports — every cross-feature import goes through the public surface.\n`);
    process.exit(0);
  }
  process.stderr.write(`❌ verify-no-cross-feature-imports: ${violations.length} cross-feature internals import(s)\n\n`);
  for (const v of violations) {
    process.stderr.write(`  ${v.file}: feature "${v.sourceFeature}" imports "${v.specifier}" (reaches into feature "${v.targetFeature}" internals)\n`);
    process.stderr.write(`     allowed: ${v.allowed}\n`);
  }
  process.stderr.write(
    `\nFeatures are self-contained. Cross-feature imports go through the public surface (the target feature's index.ts barrel). If you need an internal symbol, either move the symbol to the target feature's public surface, or move the consuming code into the target feature.\n`,
  );
  process.exit(1);
}
