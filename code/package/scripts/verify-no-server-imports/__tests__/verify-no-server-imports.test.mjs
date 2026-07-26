// Vitest suite for the verify-no-server-imports gate (G-CLIENT-SERVER-BOUNDARY).
// Exercises the pure helpers (isServerOnlyLayerPath, parseModule,
// resolveSpecifier) without fs, and findViolations against a tmp fixture tree.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

import {
  isServerOnlyLayerPath,
  parseModule,
  resolveSpecifier,
  findViolations,
  isCliInvocation,
  _constants,
} from "../verify-no-server-imports.mjs";

describe("isServerOnlyLayerPath", () => {
  it("flags the server-only layers", () => {
    expect(isServerOnlyLayerPath("db/client.ts")).toBe(true);
    expect(isServerOnlyLayerPath("features/identity/services/auth.ts")).toBe(true);
    expect(isServerOnlyLayerPath("features/identity/handlers/login.ts")).toBe(true);
    expect(isServerOnlyLayerPath("features/identity/db/repositories/users.ts")).toBe(true);
  });
  it("does not flag client-safe layers", () => {
    expect(isServerOnlyLayerPath("features/identity/components/Form.tsx")).toBe(false);
    expect(isServerOnlyLayerPath("features/identity/actions/login.action.ts")).toBe(false);
    expect(isServerOnlyLayerPath("lib/format.ts")).toBe(false);
  });
});

describe("parseModule", () => {
  it("detects the use-client directive (leading comments allowed)", () => {
    expect(parseModule('"use client";\nimport x from "y";').useClient).toBe(true);
    expect(parseModule("// a\n'use client'\n").useClient).toBe(true);
    expect(parseModule('import x from "y";\n"use client";').useClient).toBe(false);
  });
  it("detects a server-only import + collects specifiers", () => {
    const m = parseModule('import "server-only";\nimport { a } from "@/db/client";');
    expect(m.serverOnlyImport).toBe(true);
    expect(m.imports).toContain("@/db/client");
  });
});

describe("resolveSpecifier", () => {
  const dir = mkdtempSync(join(tmpdir(), "vnsi-res-"));
  mkdirSync(join(dir, "db"), { recursive: true });
  writeFileSync(join(dir, "db", "client.ts"), "export const sql = 1;");
  it("resolves @/ alias to a real file", () => {
    expect(resolveSpecifier("@/db/client", dir, dir)).toBe(join(dir, "db", "client.ts"));
  });
  it("returns null for bare packages", () => {
    expect(resolveSpecifier("postgres", dir, dir)).toBeNull();
    expect(resolveSpecifier("server-only", dir, dir)).toBeNull();
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
});

describe("findViolations (closure)", () => {
  const src = mkdtempSync(join(tmpdir(), "vnsi-src-"));
  mkdirSync(join(src, "db"), { recursive: true });
  mkdirSync(join(src, "features", "x", "components"), { recursive: true });
  writeFileSync(join(src, "db", "client.ts"), "export const sql = 1;");

  it("flags a use-client module reaching a server-only module", () => {
    const f = join(src, "features", "x", "components", "bad.tsx");
    writeFileSync(f, '"use client";\nimport { sql } from "@/db/client";\nvoid sql;');
    const v = findViolations(src);
    expect(v.some((x) => x.serverModule === "db/client.ts")).toBe(true);
    rmSync(f);
  });

  it("passes a use-client module with no server-only import", () => {
    const f = join(src, "features", "x", "components", "ok.tsx");
    writeFileSync(f, '"use client";\nimport { useState } from "react";\nvoid useState;');
    expect(findViolations(src)).toHaveLength(0);
    rmSync(f);
  });

  afterAll(() => rmSync(src, { recursive: true, force: true }));
});

describe("CLI guard + constants", () => {
  it("isCliInvocation matches only when argv1 is this module", () => {
    const url = "file:///x/verify-no-server-imports.mjs";
    expect(isCliInvocation(url, undefined)).toBe(false);
    expect(isCliInvocation(url, pathToFileURL("/x/verify-no-server-imports.mjs").pathname)).toBe(true);
  });
  it("exposes VIOLATION_MESSAGE_PREFIX", () => {
    expect(_constants.VIOLATION_MESSAGE_PREFIX).toContain("G-CLIENT-SERVER-BOUNDARY");
  });
});
