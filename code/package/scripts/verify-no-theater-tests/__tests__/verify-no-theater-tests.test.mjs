import { test } from "node:test";
import assert from "node:assert/strict";
import { extractItBlocks, isNegativeNoOpBlock, scanSource } from "../verify-no-theater-tests.mjs";

test("extractItBlocks extracts each it/test arrow body", () => {
  const src = `
    it("alpha", () => { expect(1).toBe(1); });
    test("beta", async () => { const x = 1; expect(x).toBe(1); });
  `;
  const blocks = extractItBlocks(src);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].name, "alpha");
  assert.equal(blocks[1].name, "beta");
  assert.ok(blocks[0].body.includes("expect(1).toBe(1)"));
});

test("isNegativeNoOpBlock: only .not.toThrow() = true", () => {
  assert.equal(isNegativeNoOpBlock(`expect(fn).not.toThrow();`), true);
  assert.equal(isNegativeNoOpBlock(`expect(() => doIt()).not.toThrow()`), true);
});

test("isNegativeNoOpBlock: has specific expect = false", () => {
  assert.equal(
    isNegativeNoOpBlock(`expect(fn).not.toThrow(); expect(result).toBe(42);`),
    false,
  );
});

test("isNegativeNoOpBlock: no expect at all = false", () => {
  assert.equal(isNegativeNoOpBlock(`const x = 1;`), false);
});

test("scanSource detects trivial-true pattern", () => {
  const hits = scanSource(`it("x", () => { expect(true).toBe(true); });`);
  assert.ok(hits.some((h) => h.pattern === "trivial-true"));
});

test("scanSource detects empty-it pattern", () => {
  const hits = scanSource(`it("does nothing", () => {});`);
  assert.ok(hits.some((h) => h.pattern === "empty-it"));
});

test("scanSource detects negative-no-op pattern", () => {
  const src = `it("smoke", () => { expect(() => start()).not.toThrow(); });`;
  const hits = scanSource(src);
  assert.ok(hits.some((h) => h.pattern === "negative-no-op"));
});

test("scanSource passes a real assertion", () => {
  const src = `it("does work", () => { expect(addOne(1)).toBe(2); });`;
  const hits = scanSource(src);
  assert.equal(hits.length, 0);
});
