import { test } from "node:test";
import assert from "node:assert/strict";
import { pollHttp, findErrorLines } from "../verify-dev-server-boots.mjs";
import { createServer } from "node:http";

test("findErrorLines surfaces error/fatal/uncaught lines", () => {
  const text = [
    "ready - started server on 0.0.0.0:3000",
    "Compiled successfully",
    "TypeError: Cannot read properties of undefined",
    "info  - bootstrap took 1.2s",
    "[ERROR] Cannot find module 'foo'",
    "  at handler (file.js:1:1)",
  ].join("\n");
  const lines = findErrorLines(text);
  assert.equal(lines.length, 2);
  assert.ok(lines[0].includes("TypeError"));
  assert.ok(lines[1].includes("Cannot find module"));
});

test("findErrorLines empty on clean output", () => {
  const text = "ready - started server\nCompiled successfully\ninfo - 200 OK\n";
  assert.deepEqual(findErrorLines(text), []);
});

test("pollHttp succeeds when server returns 200", async () => {
  const server = createServer((_req, res) => { res.statusCode = 200; res.end("ok"); });
  await new Promise((r) => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  try {
    const result = await pollHttp(url, 2000);
    assert.equal(result.ok, true);
    assert.equal(result.status, 200);
    assert.ok(result.ms >= 0 && result.ms < 2000);
  } finally {
    server.close();
  }
});

test("pollHttp times out when nothing responds", async () => {
  // pick a port nothing's listening on
  const result = await pollHttp("http://127.0.0.1:1/", 600);
  assert.equal(result.ok, false);
  assert.equal(result.status, null);
  assert.ok(result.ms >= 500);
});

test("pollHttp treats 3xx redirect as ok", async () => {
  const server = createServer((_req, res) => {
    res.statusCode = 302;
    res.setHeader("Location", "/foo");
    res.end();
  });
  await new Promise((r) => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  try {
    const result = await pollHttp(url, 2000);
    assert.equal(result.ok, true);
    assert.equal(result.status, 302);
  } finally {
    server.close();
  }
});
