import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractRelativeSpecifiers,
  resolveImportTarget,
  featureNameFor,
  classifyCrossFeatureImport,
} from "../verify-no-cross-feature-imports.mjs";

test("extractRelativeSpecifiers finds only ./ or ../ specifiers", () => {
  const src = `
    import bare from "react";
    import local from "./local";
    import up from "../sibling";
    import deep from "../../features/other/internals";
  `;
  const specs = extractRelativeSpecifiers(src);
  assert.deepEqual(specs.sort(), ["../../features/other/internals", "../sibling", "./local"].sort());
});

test("extractRelativeSpecifiers strips // comments before matching", () => {
  const src = `import real from "./real"; // import fake from "./fake"`;
  const specs = extractRelativeSpecifiers(src);
  assert.deepEqual(specs, ["./real"]);
});

test("resolveImportTarget resolves + strips .ts/.tsx + /index", () => {
  const src = "/repo/src/features/a/services/svc.ts";
  assert.equal(resolveImportTarget(src, "../../b"), "/repo/src/features/b");
  assert.equal(resolveImportTarget(src, "../../b/index"), "/repo/src/features/b");
  assert.equal(resolveImportTarget(src, "../../b/internals.ts"), "/repo/src/features/b/internals");
  assert.equal(resolveImportTarget(src, "./helper.tsx"), "/repo/src/features/a/services/helper");
});

test("featureNameFor extracts slug between features/ and next /", () => {
  const fr = "/repo/src/features";
  assert.equal(featureNameFor("/repo/src/features/auth/index.ts", fr), "auth");
  assert.equal(featureNameFor("/repo/src/features/auth", fr), "auth");
  assert.equal(featureNameFor("/repo/src/features/billing/db/x.ts", fr), "billing");
  assert.equal(featureNameFor("/repo/src/lib/util.ts", fr), null);
});

test("classifyCrossFeatureImport: same-feature is allowed", () => {
  const fr = "/repo/src/features";
  const r = classifyCrossFeatureImport("auth", "/repo/src/features/auth/services/svc", fr);
  assert.equal(r.kind, "same-feature");
});

test("classifyCrossFeatureImport: public-surface (feature root) is allowed", () => {
  const fr = "/repo/src/features";
  const r = classifyCrossFeatureImport("auth", "/repo/src/features/billing", fr);
  assert.equal(r.kind, "public-surface");
  assert.equal(r.targetFeature, "billing");
});

test("classifyCrossFeatureImport: internals reach is a violation", () => {
  const fr = "/repo/src/features";
  const r = classifyCrossFeatureImport("auth", "/repo/src/features/billing/db/things", fr);
  assert.equal(r.kind, "internals");
  assert.equal(r.targetFeature, "billing");
});

test("classifyCrossFeatureImport: import outside features/ is same-feature (out-of-scope for this gate)", () => {
  const fr = "/repo/src/features";
  const r = classifyCrossFeatureImport("auth", "/repo/src/lib/util", fr);
  assert.equal(r.kind, "same-feature");
});
