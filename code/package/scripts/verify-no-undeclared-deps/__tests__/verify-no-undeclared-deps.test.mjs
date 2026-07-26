import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rootPackageName,
  extractSpecifiers,
  declaredDepsForFile,
  workspacePackageNames,
} from "../verify-no-undeclared-deps.mjs";

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("rootPackageName extracts package root from various spec shapes", () => {
  assert.equal(rootPackageName("foo"), "foo");
  assert.equal(rootPackageName("foo/sub/path"), "foo");
  assert.equal(rootPackageName("@scope/foo"), "@scope/foo");
  assert.equal(rootPackageName("@scope/foo/sub"), "@scope/foo");
});

test("extractSpecifiers finds import + require + dynamic-import + from clauses", () => {
  const src = `
    import x from "foo";
    import { y } from "bar/sub";
    const z = require("baz");
    const w = await import("qux");
    import("dynamic-one");
  `;
  const specs = extractSpecifiers(src);
  for (const s of ["foo", "bar/sub", "baz", "qux", "dynamic-one"]) {
    assert.ok(specs.includes(s), `expected ${s} in ${JSON.stringify(specs)}`);
  }
});

test("extractSpecifiers strips // line comments before matching", () => {
  const src = `
    import real from "real-pkg";
    // import fake from "fake-pkg";
    const x = 1; // require("also-fake")
  `;
  const specs = extractSpecifiers(src);
  assert.ok(specs.includes("real-pkg"));
  assert.ok(!specs.includes("fake-pkg"));
  assert.ok(!specs.includes("also-fake"));
});

test("declaredDepsForFile walks up to nearest package.json + returns merged dep set", () => {
  const root = mkdtempSync(join(tmpdir(), "vnud-decl-"));
  try {
    writeFileSync(join(root, "package.json"), JSON.stringify({
      dependencies: { "dep-a": "1.0.0" },
      devDependencies: { "dep-b": "1.0.0" },
      peerDependencies: { "dep-c": "1.0.0" },
      optionalDependencies: { "dep-d": "1.0.0" },
    }));
    mkdirSync(join(root, "src", "deep"), { recursive: true });
    const deps = declaredDepsForFile(join(root, "src", "deep"), root);
    assert.equal(deps.size, 4);
    for (const name of ["dep-a", "dep-b", "dep-c", "dep-d"]) assert.ok(deps.has(name));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("workspacePackageNames reads pnpm-workspace.yaml + resolves each package's name field", () => {
  const root = mkdtempSync(join(tmpdir(), "vnud-ws-"));
  try {
    writeFileSync(join(root, "pnpm-workspace.yaml"), `packages:\n  - 'packages/*'\n`);
    mkdirSync(join(root, "packages", "alpha"), { recursive: true });
    writeFileSync(join(root, "packages", "alpha", "package.json"), JSON.stringify({ name: "@example/alpha" }));
    mkdirSync(join(root, "packages", "beta"), { recursive: true });
    writeFileSync(join(root, "packages", "beta", "package.json"), JSON.stringify({ name: "@example/beta" }));
    const ws = workspacePackageNames(root);
    assert.equal(ws.size, 2);
    assert.ok(ws.has("@example/alpha"));
    assert.ok(ws.has("@example/beta"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("declaredDepsForFile returns empty set when no package.json found", () => {
  const root = mkdtempSync(join(tmpdir(), "vnud-empty-"));
  try {
    const deps = declaredDepsForFile(root, root);
    assert.equal(deps.size, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
