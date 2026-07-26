#!/usr/bin/env node
/**
 * verify-no-undeclared-deps.mjs
 *
 * Refuses any `import` / `require` / dynamic-`import()` specifier in
 * `src/` that does not trace to a declared dependency. Closes the most
 * common hallucination vector: importing from a package name that
 * doesn't exist in the repo's `package.json`.
 *
 * What counts as "declared":
 *   - relative path (`./foo`, `../bar`)
 *   - Node built-in module (every name in `node:module#builtinModules`,
 *     with or without the `node:` prefix)
 *   - subpath import (`#alias`) declared under `package.json#imports`
 *   - workspace sibling (declared in `pnpm-workspace.yaml` packages)
 *   - bare specifier (`foo`, `@scope/foo`, `foo/sub/path`) whose root
 *     package name is in `dependencies` / `devDependencies` /
 *     `peerDependencies` / `optionalDependencies` of the nearest
 *     `package.json` walking up from the source file
 *
 * Pure Node + zero external deps. Helpers exported for vitest / node:test
 * coverage from the sibling `__tests__/`.
 *
 * Usage:
 *   node verify-no-undeclared-deps.mjs [<src-root>]   default: "src"
 *
 * Exit: 0 if every specifier is declared; 1 if any are not.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { builtinModules } from "node:module";

const SOURCE_ROOT = process.argv[2] || "src";
const REPO_ROOT = process.cwd();
const absRoot = join(REPO_ROOT, SOURCE_ROOT);

const SKIP_DIRS = new Set([
  "node_modules", ".next", ".turbo", "dist", "build", "out", ".git",
  "coverage", "test-results", "playwright-report",
]);

const SCANNABLE_EXTS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);

const BUILTINS = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);

/**
 * tsconfig.json compilerOptions.paths aliases → bare prefixes treated as
 * internal (NOT undeclared deps). `"@/*": ["./src/*"]` → prefix `@/`. The `@/`
 * src alias is the YK-wide convention (STACK.yaml), so `@/db/client` resolves
 * inside the repo, not to an npm package.
 */
function tsconfigAliasPrefixes(repoRoot) {
  const tsconfigPath = join(repoRoot, "tsconfig.json");
  if (!existsSync(tsconfigPath)) return [];
  try {
    const raw = readFileSync(tsconfigPath, "utf8").replace(/\/\/.*$/gm, "");
    const paths = JSON.parse(raw)?.compilerOptions?.paths ?? {};
    return Object.keys(paths).map((k) => k.replace(/\*+$/, "")).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Extracts the package-root name from a bare specifier.
 * `foo` → `foo`
 * `foo/sub/path` → `foo`
 * `@scope/foo` → `@scope/foo`
 * `@scope/foo/sub` → `@scope/foo`
 *
 * @param {string} spec
 * @returns {string}
 */
export function rootPackageName(spec) {
  if (spec.startsWith("@")) {
    const parts = spec.split("/");
    return parts.slice(0, 2).join("/");
  }
  return spec.split("/")[0];
}

/**
 * Parses every import / require / dynamic-import specifier from a source
 * string. Strips // line comments before matching (so imports referenced
 * in JSDoc / inline comments don't fire).
 *
 * @param {string} src
 * @returns {string[]}
 */
export function extractSpecifiers(src) {
  const stripped = src
    .split("\n")
    .map((line) => line.replace(/(?<!:)\/\/.*$/, ""))
    .join("\n");
  const out = [];
  const re = /(?:^|[\s;{(=,])(?:import|require)\s*\(?\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(stripped)) !== null) out.push(m[1]);
  const re2 = /\bfrom\s*["']([^"']+)["']/g;
  while ((m = re2.exec(stripped)) !== null) out.push(m[1]);
  return [...new Set(out)];
}

/**
 * Walks up from `fromDir` looking for the nearest `package.json` and
 * returns the merged set of declared package names (deps + devDeps +
 * peerDeps + optionalDeps).
 *
 * @param {string} fromDir
 * @param {string} stopAt   walk-stop boundary
 * @returns {Set<string>}
 */
export function declaredDepsForFile(fromDir, stopAt) {
  let dir = fromDir;
  while (true) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        const set = new Set();
        for (const k of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
          if (pkg[k]) for (const name of Object.keys(pkg[k])) set.add(name);
        }
        return set;
      } catch { /* fall through */ }
    }
    if (dir === stopAt || dir === dirname(dir)) return new Set();
    dir = dirname(dir);
  }
}

/**
 * Reads pnpm-workspace.yaml's `packages:` globs (if present) and
 * resolves to the set of declared workspace package names.
 *
 * @param {string} repoRoot
 * @returns {Set<string>}
 */
export function workspacePackageNames(repoRoot) {
  const wsPath = join(repoRoot, "pnpm-workspace.yaml");
  if (!existsSync(wsPath)) return new Set();
  const txt = readFileSync(wsPath, "utf8");
  const out = new Set();
  // crude line-based parse: find each workspace dir under packages: list,
  // resolve dir/package.json, read its name field
  const lines = txt.split("\n").map((l) => l.trim());
  const inPackages = lines.findIndex((l) => l.startsWith("packages:")) !== -1;
  if (!inPackages) return out;
  const globs = lines
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).replace(/^["']|["']$/g, ""));
  for (const glob of globs) {
    const bareDir = glob.replace(/\/\*+$/, "");
    const parent = join(repoRoot, bareDir);
    if (!existsSync(parent)) continue;
    try {
      for (const entry of readdirSync(parent, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const pkgPath = join(parent, entry.name, "package.json");
        if (!existsSync(pkgPath)) continue;
        try {
          const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
          if (pkg.name) out.add(pkg.name);
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }
  return out;
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
    let src;
    try { src = readFileSync(file, "utf8"); } catch { continue; }
    const specs = extractSpecifiers(src);
    if (specs.length === 0) continue;
    const deps = declaredDepsForFile(dirname(file), REPO_ROOT);
    for (const spec of specs) {
      if (spec.startsWith(".") || spec.startsWith("/")) continue;
      if (spec.startsWith("#")) continue;
      if (tsAliasPrefixes.some((p) => spec === p.replace(/\/$/, "") || spec.startsWith(p))) continue;
      if (BUILTINS.has(spec) || BUILTINS.has(`node:${spec}`)) continue;
      const root = rootPackageName(spec);
      if (deps.has(root)) continue;
      if (workspaces.has(root)) continue;
      violations.push({ file: relative(REPO_ROOT, file), specifier: spec, root });
    }
  }
}

const workspaces = workspacePackageNames(REPO_ROOT);
const tsAliasPrefixes = tsconfigAliasPrefixes(REPO_ROOT);

function isCli() {
  return import.meta.url === `file://${process.argv[1]}`;
}

if (isCli()) {
  if (!existsSync(absRoot)) {
    process.stdout.write(
      `✅ verify-no-undeclared-deps — no ${SOURCE_ROOT}/ in this repo; nothing to check.\n`,
    );
    process.exit(0);
  }
  walk(absRoot);
} else {
  // imported by tests — skip CLI walk
}

if (isCli()) {
  if (violations.length === 0) {
    process.stdout.write(
      `✅ verify-no-undeclared-deps — every import specifier in ${SOURCE_ROOT}/ traces to a declared dependency.\n`,
    );
    process.exit(0);
  }
  process.stderr.write(`❌ verify-no-undeclared-deps: ${violations.length} undeclared specifier(s)\n\n`);
  for (const v of violations) {
    process.stderr.write(`  ${v.file}: imports "${v.specifier}" (package "${v.root}" not in package.json)\n`);
  }
  process.stderr.write(
    `\nAdd the missing packages to dependencies/devDependencies in the nearest package.json, or fix the import to use a relative path / workspace alias / Node built-in.\n`,
  );
  process.exit(1);
}
