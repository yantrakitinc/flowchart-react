#!/usr/bin/env node
// ESLint permission-rule verifier.
//
// Asserts the four PRIMARY-RULE ESLint guards
// actually fire on known-violating snippets, AND that their allow-list
// overrides actually allow.
//
// Why this script exists:
// The PRIMARY RULE's compile-time enforcement leans on a small set of
// ESLint rules configured in `eslint.config.mjs`. If a future config
// refactor silently drops or relaxes any of them, the brand type
// `AuthorizedPrincipal<S>` becomes a paper tiger. This script catches
// that drift by feeding known-violating snippets through
// `eslint --stdin --stdin-filename` and asserting the expected
// diagnostic appears (or, for allow-list fixtures, asserting NO
// violation appears).
//
// The script uses `--stdin-filename` so no temporary files touch disk —
// ESLint flat-config `files:` globs are matched against the supplied
// virtual filename and the override rules apply as if the snippet lived
// at that path. `--no-ignore` bypasses `.gitignore` / `node_modules`
// filters since the synthetic filenames don't actually exist on disk.
//
// Pure Node + zero external dependencies. Helpers are exported so the
// Vitest suite can exercise every branch without depending on a real
// ESLint binary.

import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const ROOT_DIR = resolve(SCRIPT_DIR, "..", "..");
const DEFAULT_ESLINT_BIN = join(ROOT_DIR, "node_modules", ".bin", "eslint");

const BRAND_CAST_FORBIDDEN_MESSAGE =
  "Cannot cast to AuthorizedPrincipal — use mintAuthorizedPrincipal() from src/lib/authz/mint.";
const RAW_DB_IMPORT_FORBIDDEN_MESSAGE_FRAGMENT =
  "Don't import raw db handles outside src/db/.";
const DRIZZLE_IMPORT_FORBIDDEN_MESSAGE_FRAGMENT =
  "Don't import drizzle-orm outside src/db/.";
const TS_DIRECTIVE_FORBIDDEN_MESSAGE_FRAGMENT =
  "alters compilation errors";
const MODULE_BOUNDARY_FORBIDDEN_MESSAGE_FRAGMENT =
  "Cross-feature deep import of @/features/";

/**
 * The brand-cast violation snippet — declares a local `AuthorizedPrincipal`
 * type and casts to it.
 */
const BRAND_CAST_SNIPPET = `
declare const raw: { kind: "user"; id: string; email: string };
type AuthorizedPrincipal<S extends string> = {
  readonly id: string;
  readonly __b: (s: S) => void;
};
const y = raw as AuthorizedPrincipal<"users:read">;
void y;
`;

/** The angle-bracket-cast variant. */
const ANGLE_BRACKET_CAST_SNIPPET = `
declare const raw: { kind: "user"; id: string; email: string };
type AuthorizedPrincipal<S extends string> = {
  readonly id: string;
  readonly __b: (s: S) => void;
};
const y = <AuthorizedPrincipal<"users:read">>raw;
void y;
`;

/** The raw-db-import violation snippet. */
const RAW_DB_IMPORT_SNIPPET = `
import { getDb } from "@/db/client/client";
void getDb;
`;

/** The drizzle-orm import violation snippet. */
const DRIZZLE_IMPORT_SNIPPET = `
import { eq } from "drizzle-orm";
void eq;
`;

/** The drizzle-orm subpath import variant. */
const DRIZZLE_SUBPATH_IMPORT_SNIPPET = `
import { drizzle } from "drizzle-orm/postgres-js";
void drizzle;
`;

/** The TS-directive-in-db violation snippet. */
const TS_DIRECTIVE_SNIPPET = `
// @ts-expect-error - description doesn't help inside src/db
const x: string = 42;
void x;
`;

/** Module-boundary violation snippets. */
const MODULE_BOUNDARY_IDENTITY_SERVICES_SNIPPET = `
import { AuthServiceClass } from "@/features/identity/auth/services/auth.service";
void AuthServiceClass;
`;
const MODULE_BOUNDARY_ADMIN_HANDLERS_SNIPPET = `
import { listJobsHandler } from "@/features/admin/jobs/handlers/list-jobs.handler";
void listJobsHandler;
`;
const MODULE_BOUNDARY_INFRA_VALIDATION_SNIPPET = `
import { someSchema } from "@/features/infra/youtube/validation/some-schema";
void someSchema;
`;
const MODULE_BOUNDARY_ADMIN_API_CONTRACT_SNIPPET = `
import { listJobsRegistration } from "@/features/admin/jobs/api-contract/list-jobs.openapi";
void listJobsRegistration;
`;

/** Allow-listed module-boundary shapes — the documented entry points. */
const MODULE_BOUNDARY_IDENTITY_BARREL_SNIPPET = `
import { AuthServiceClass } from "@/features/identity/auth";
void AuthServiceClass;
`;
const MODULE_BOUNDARY_IDENTITY_TYPES_REPOSITORIES_SNIPPET = `
import type { iUsersRepository } from "@/features/identity/auth/types/repositories";
declare const r: iUsersRepository;
void r;
`;
const MODULE_BOUNDARY_IDENTITY_TYPES_DOMAIN_SNIPPET = `
import type { iUser } from "@/features/identity/auth/types/domain";
declare const u: iUser;
void u;
`;
const MODULE_BOUNDARY_IDENTITY_PERMISSIONS_SNIPPET = `
import { AUTH_PERMISSION_KEYS } from "@/features/identity/auth/permissions";
void AUTH_PERMISSION_KEYS;
`;
const MODULE_BOUNDARY_IDENTITY_COMPOSITION_ROOT_SNIPPET = `
import { getIdentityServices } from "@/features/identity/composition-root";
void getIdentityServices;
`;

/**
 * The fixture matrix. Each row is one (virtual-path, snippet, expectation)
 * triple. `expect: "violation"` rows assert the named rule fires and the
 * expected message fragment appears; `expect: "allowed"` rows assert NO
 * violation of the named rule appears (other unrelated diagnostics are
 * ignored — the test is rule-scoped).
 *
 * @type {ReadonlyArray<{
 *   name: string;
 *   virtualPath: string;
 *   source: string;
 *   expect: "violation" | "allowed";
 *   ruleId: string;
 *   messageFragment: string;
 * }>}
 */
export const FIXTURES = [
  // ---- Rule 1: brand cast forbidden outside mint ----
  {
    name: "Rule1.violation/as-cast-in-module",
    virtualPath: "src/features/identity/auth/handlers/synthetic-fixture.ts",
    source: BRAND_CAST_SNIPPET,
    expect: "violation",
    ruleId: "no-restricted-syntax",
    messageFragment: BRAND_CAST_FORBIDDEN_MESSAGE,
  },
  {
    name: "Rule1.violation/angle-bracket-cast-in-module",
    virtualPath: "src/features/identity/auth/handlers/synthetic-fixture.ts",
    source: ANGLE_BRACKET_CAST_SNIPPET,
    expect: "violation",
    ruleId: "no-restricted-syntax",
    messageFragment: BRAND_CAST_FORBIDDEN_MESSAGE,
  },
  {
    name: "Rule1.violation/as-cast-in-route",
    virtualPath: "src/app/api/v1/synthetic/route.ts",
    source: BRAND_CAST_SNIPPET,
    expect: "violation",
    ruleId: "no-restricted-syntax",
    messageFragment: BRAND_CAST_FORBIDDEN_MESSAGE,
  },
  {
    name: "Rule1.violation/as-cast-in-db-repository",
    virtualPath: "src/db/identity/auth/repositories/synthetic-fixture.ts",
    source: BRAND_CAST_SNIPPET,
    expect: "violation",
    ruleId: "no-restricted-syntax",
    messageFragment: BRAND_CAST_FORBIDDEN_MESSAGE,
  },
  {
    name: "Rule1.allowed/as-cast-inside-mint-helper",
    virtualPath: "src/lib/authz/mint/synthetic-fixture.ts",
    source: BRAND_CAST_SNIPPET,
    expect: "allowed",
    ruleId: "no-restricted-syntax",
    messageFragment: BRAND_CAST_FORBIDDEN_MESSAGE,
  },

  // ---- Rule 2: raw db handle import forbidden outside allow-list ----
  {
    name: "Rule2.violation/getDb-imported-in-module",
    virtualPath: "src/features/identity/auth/handlers/synthetic-fixture.ts",
    source: RAW_DB_IMPORT_SNIPPET,
    expect: "violation",
    ruleId: "no-restricted-imports",
    messageFragment: RAW_DB_IMPORT_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule2.violation/getDb-imported-in-lib",
    virtualPath: "src/lib/synthetic-fixture.ts",
    source: RAW_DB_IMPORT_SNIPPET,
    expect: "violation",
    ruleId: "no-restricted-imports",
    messageFragment: RAW_DB_IMPORT_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule2.allowed/getDb-imported-in-db-tree",
    virtualPath: "src/db/identity/auth/repositories/synthetic-fixture.ts",
    source: RAW_DB_IMPORT_SNIPPET,
    expect: "allowed",
    ruleId: "no-restricted-imports",
    messageFragment: RAW_DB_IMPORT_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule2.allowed/getDb-imported-in-composition-root",
    virtualPath: "src/features/identity/composition-root.ts",
    source: RAW_DB_IMPORT_SNIPPET,
    expect: "allowed",
    ruleId: "no-restricted-imports",
    messageFragment: RAW_DB_IMPORT_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule2.allowed/getDb-imported-in-tests",
    virtualPath: "src/features/identity/__tests__/synthetic-fixture.test.ts",
    source: RAW_DB_IMPORT_SNIPPET,
    expect: "allowed",
    ruleId: "no-restricted-imports",
    messageFragment: RAW_DB_IMPORT_FORBIDDEN_MESSAGE_FRAGMENT,
  },

  // ---- Rule 2b: raw drizzle-orm import forbidden outside allow-list ----
  {
    name: "Rule2b.violation/drizzle-orm-imported-in-module-handler",
    virtualPath: "src/features/admin/seed/handlers/synthetic-fixture.ts",
    source: DRIZZLE_IMPORT_SNIPPET,
    expect: "violation",
    ruleId: "no-restricted-imports",
    messageFragment: DRIZZLE_IMPORT_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule2b.violation/drizzle-orm-imported-in-route",
    virtualPath: "src/app/api/v1/synthetic/route.ts",
    source: DRIZZLE_IMPORT_SNIPPET,
    expect: "violation",
    ruleId: "no-restricted-imports",
    messageFragment: DRIZZLE_IMPORT_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule2b.violation/drizzle-orm-imported-in-lib",
    virtualPath: "src/lib/synthetic-fixture.ts",
    source: DRIZZLE_IMPORT_SNIPPET,
    expect: "violation",
    ruleId: "no-restricted-imports",
    messageFragment: DRIZZLE_IMPORT_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule2b.violation/drizzle-orm-subpath-imported-in-module",
    virtualPath: "src/features/identity/auth/services/synthetic-fixture.ts",
    source: DRIZZLE_SUBPATH_IMPORT_SNIPPET,
    expect: "violation",
    ruleId: "no-restricted-imports",
    messageFragment: DRIZZLE_IMPORT_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule2b.allowed/drizzle-orm-imported-in-db-tree",
    virtualPath: "src/db/identity/auth/repositories/synthetic-fixture.ts",
    source: DRIZZLE_IMPORT_SNIPPET,
    expect: "allowed",
    ruleId: "no-restricted-imports",
    messageFragment: DRIZZLE_IMPORT_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule2b.allowed/drizzle-orm-subpath-imported-in-db-tree",
    virtualPath: "src/db/seed/cli/synthetic-fixture.ts",
    source: DRIZZLE_SUBPATH_IMPORT_SNIPPET,
    expect: "allowed",
    ruleId: "no-restricted-imports",
    messageFragment: DRIZZLE_IMPORT_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule2b.allowed/drizzle-orm-imported-in-composition-root",
    virtualPath: "src/features/identity/composition-root.ts",
    source: DRIZZLE_IMPORT_SNIPPET,
    expect: "allowed",
    ruleId: "no-restricted-imports",
    messageFragment: DRIZZLE_IMPORT_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule2b.allowed/drizzle-orm-imported-in-tests",
    virtualPath: "src/features/identity/__tests__/synthetic-fixture.test.ts",
    source: DRIZZLE_IMPORT_SNIPPET,
    expect: "allowed",
    ruleId: "no-restricted-imports",
    messageFragment: DRIZZLE_IMPORT_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule2b.allowed/drizzle-orm-imported-in-e2e-fixtures",
    virtualPath: "e2e/fixtures/synthetic-fixture.ts",
    source: DRIZZLE_IMPORT_SNIPPET,
    expect: "allowed",
    ruleId: "no-restricted-imports",
    messageFragment: DRIZZLE_IMPORT_FORBIDDEN_MESSAGE_FRAGMENT,
  },

  // ---- Rule 3: @ts-* directives forbidden inside src/db/ ----
  {
    name: "Rule3.violation/ts-expect-error-in-db-repo",
    virtualPath: "src/db/identity/auth/repositories/synthetic-fixture.ts",
    source: TS_DIRECTIVE_SNIPPET,
    expect: "violation",
    ruleId: "@typescript-eslint/ban-ts-comment",
    messageFragment: TS_DIRECTIVE_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule3.allowed/ts-expect-error-with-description-in-module-test",
    virtualPath: "src/features/identity/__tests__/synthetic-fixture.test.ts",
    source: TS_DIRECTIVE_SNIPPET,
    expect: "allowed",
    ruleId: "@typescript-eslint/ban-ts-comment",
    messageFragment: TS_DIRECTIVE_FORBIDDEN_MESSAGE_FRAGMENT,
  },

  // ---- Rule 4: module-boundary deep imports forbidden across modules ----
  {
    name: "Rule4.violation/identity-services-from-route",
    virtualPath: "src/app/api/v1/synthetic/route.ts",
    source: MODULE_BOUNDARY_IDENTITY_SERVICES_SNIPPET,
    expect: "violation",
    ruleId: "no-restricted-imports",
    messageFragment: MODULE_BOUNDARY_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule4.violation/admin-handlers-from-other-module",
    virtualPath: "src/features/infra/jobs/services/synthetic.service.ts",
    source: MODULE_BOUNDARY_ADMIN_HANDLERS_SNIPPET,
    expect: "violation",
    ruleId: "no-restricted-imports",
    messageFragment: MODULE_BOUNDARY_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule4.violation/infra-validation-from-app-page",
    virtualPath: "src/app/(pages)/synthetic/page.tsx",
    source: MODULE_BOUNDARY_INFRA_VALIDATION_SNIPPET,
    expect: "violation",
    ruleId: "no-restricted-imports",
    messageFragment: MODULE_BOUNDARY_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule4.violation/admin-api-contract-from-identity-module",
    virtualPath: "src/features/identity/auth/services/synthetic.service.ts",
    source: MODULE_BOUNDARY_ADMIN_API_CONTRACT_SNIPPET,
    expect: "violation",
    ruleId: "no-restricted-imports",
    messageFragment: MODULE_BOUNDARY_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  // Allow-list passthroughs — the five documented entry points.
  {
    name: "Rule4.allowed/sub-feature-barrel-from-route",
    virtualPath: "src/app/api/v1/synthetic/route.ts",
    source: MODULE_BOUNDARY_IDENTITY_BARREL_SNIPPET,
    expect: "allowed",
    ruleId: "no-restricted-imports",
    messageFragment: MODULE_BOUNDARY_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule4.allowed/types-repositories-from-other-module",
    virtualPath: "src/features/admin/jobs/handlers/synthetic.handler.ts",
    source: MODULE_BOUNDARY_IDENTITY_TYPES_REPOSITORIES_SNIPPET,
    expect: "allowed",
    ruleId: "no-restricted-imports",
    messageFragment: MODULE_BOUNDARY_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule4.allowed/types-domain-from-other-module",
    virtualPath: "src/features/admin/jobs/handlers/synthetic.handler.ts",
    source: MODULE_BOUNDARY_IDENTITY_TYPES_DOMAIN_SNIPPET,
    expect: "allowed",
    ruleId: "no-restricted-imports",
    messageFragment: MODULE_BOUNDARY_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule4.allowed/permissions-from-db-seed",
    virtualPath: "src/db/seed/foundation-catalog/synthetic.ts",
    source: MODULE_BOUNDARY_IDENTITY_PERMISSIONS_SNIPPET,
    expect: "allowed",
    ruleId: "no-restricted-imports",
    messageFragment: MODULE_BOUNDARY_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule4.allowed/composition-root-from-route",
    virtualPath: "src/app/api/v1/synthetic/route.ts",
    source: MODULE_BOUNDARY_IDENTITY_COMPOSITION_ROOT_SNIPPET,
    expect: "allowed",
    ruleId: "no-restricted-imports",
    messageFragment: MODULE_BOUNDARY_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule4.allowed/same-module-services-from-composition-root",
    virtualPath: "src/features/identity/composition-root.ts",
    source: MODULE_BOUNDARY_IDENTITY_SERVICES_SNIPPET,
    expect: "allowed",
    ruleId: "no-restricted-imports",
    messageFragment: MODULE_BOUNDARY_FORBIDDEN_MESSAGE_FRAGMENT,
  },
  {
    name: "Rule4.allowed/same-module-services-from-sibling-sub-feature",
    virtualPath: "src/features/identity/rbac/services/synthetic.service.ts",
    source: MODULE_BOUNDARY_IDENTITY_SERVICES_SNIPPET,
    expect: "allowed",
    ruleId: "no-restricted-imports",
    messageFragment: MODULE_BOUNDARY_FORBIDDEN_MESSAGE_FRAGMENT,
  },
];

/**
 * Default IO ports.
 */
export const defaultRunEslint = (
  /** @type {string} */ eslintBin,
  /** @type {string} */ cwd,
  /** @type {string} */ virtualPath,
  /** @type {string} */ source,
) =>
  spawnSync(
    eslintBin,
    [
      "--stdin",
      "--stdin-filename",
      virtualPath,
      "--no-ignore",
      "-f",
      "json",
    ],
    {
      input: source,
      cwd,
      encoding: "utf8",
    },
  );

export const defaultStdoutWrite = (/** @type {string} */ s) =>
  process.stdout.write(s);
export const defaultStderrWrite = (/** @type {string} */ s) =>
  process.stderr.write(s);

/**
 * Runs ESLint via spawnSync against the supplied virtual path + source and
 * parses the JSON output. Throws when spawn fails or output isn't JSON.
 *
 * @param {string} eslintBin absolute path to the ESLint binary
 * @param {string} cwd directory to run ESLint in (must contain eslint.config.mjs)
 * @param {string} virtualPath path-string ESLint uses for files-glob match
 * @param {string} source raw TypeScript source piped via stdin
 * @param {{
 *   runEslint?: (
 *     bin: string,
 *     cwd: string,
 *     vp: string,
 *     src: string,
 *   ) => { error?: Error, stdout: string, stderr: string, status: number | null },
 * }} [injected]
 * @returns {Array<{ messages: Array<{ ruleId: string | null; message: string }> }>}
 */
export function runEslintOnSnippet(
  eslintBin,
  cwd,
  virtualPath,
  source,
  injected = {},
) {
  const runEslint = injected.runEslint ?? defaultRunEslint;
  const result = runEslint(eslintBin, cwd, virtualPath, source);
  if (result.error) {
    throw new Error(
      `eslint invocation failed for ${virtualPath}: ${result.error.message}`,
    );
  }
  try {
    return JSON.parse(result.stdout);
  } catch (e) {
    throw new Error(
      `Could not parse eslint JSON output for ${virtualPath}.\n` +
        `stdout: ${result.stdout}\nstderr: ${result.stderr}\nparse error: ${String(e)}`,
    );
  }
}

/**
 * Run one fixture and return the verdict. The verdict is either ok (no
 * error message) or a single error string naming the fixture and the
 * failure reason.
 *
 * @param {{
 *   name: string;
 *   virtualPath: string;
 *   source: string;
 *   expect: "violation" | "allowed";
 *   ruleId: string;
 *   messageFragment: string;
 * }} fixture
 * @param {{
 *   eslintBin: string,
 *   cwd: string,
 *   runEslint?: (
 *     bin: string,
 *     cwd: string,
 *     vp: string,
 *     src: string,
 *   ) => { error?: Error, stdout: string, stderr: string, status: number | null },
 * }} ports
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function checkFixture(fixture, ports) {
  const results = runEslintOnSnippet(
    ports.eslintBin,
    ports.cwd,
    fixture.virtualPath,
    fixture.source,
    { runEslint: ports.runEslint },
  );
  const fileResult = results[0];
  if (!fileResult) {
    return {
      ok: false,
      error: `${fixture.name}: ESLint returned no file result for ${fixture.virtualPath}`,
    };
  }
  const matching = (fileResult.messages || []).filter(
    (m) =>
      m.ruleId === fixture.ruleId &&
      typeof m.message === "string" &&
      m.message.includes(fixture.messageFragment),
  );
  if (fixture.expect === "violation") {
    if (matching.length === 0) {
      return {
        ok: false,
        error:
          `${fixture.name}: expected ${fixture.ruleId} to fire with message containing ` +
          `"${fixture.messageFragment}", but no matching diagnostic was emitted. ` +
          `All diagnostics: ${JSON.stringify(fileResult.messages)}`,
      };
    }
    return { ok: true };
  }
  if (matching.length > 0) {
    return {
      ok: false,
      error:
        `${fixture.name}: expected ${fixture.ruleId} to NOT fire at ` +
        `${fixture.virtualPath}, but it fired with: ${JSON.stringify(matching)}`,
    };
  }
  return { ok: true };
}

/**
 * Walk every fixture and collect errors.
 *
 * @param {ReadonlyArray<{
 *   name: string;
 *   virtualPath: string;
 *   source: string;
 *   expect: "violation" | "allowed";
 *   ruleId: string;
 *   messageFragment: string;
 * }>} fixtures
 * @param {{
 *   eslintBin: string,
 *   cwd: string,
 *   runEslint?: (
 *     bin: string,
 *     cwd: string,
 *     vp: string,
 *     src: string,
 *   ) => { error?: Error, stdout: string, stderr: string, status: number | null },
 * }} ports
 * @returns {{ errors: string[], total: number }}
 */
export function audit(fixtures, ports) {
  /** @type {string[]} */
  const errors = [];
  for (const fixture of fixtures) {
    const verdict = checkFixture(fixture, ports);
    if (!verdict.ok) errors.push(verdict.error);
  }
  return { errors, total: fixtures.length };
}

/**
 * Format the audit result for stdout / stderr.
 *
 * @param {{ errors: string[], total: number }} result
 * @returns {{ exitCode: 0 | 1, stdout: string, stderr: string }}
 */
export function formatReport(result) {
  if (result.errors.length === 0) {
    return {
      exitCode: 0,
      stdout: `verify-eslint-permission-rules: OK (${String(result.total)} fixture(s) checked)\n`,
      stderr: "",
    };
  }
  const lines = [
    `verify-eslint-permission-rules: ${String(result.errors.length)} fixture failure(s)`,
  ];
  for (const e of result.errors) lines.push(`  ${e}`);
  return { exitCode: 1, stdout: "", stderr: `${lines.join("\n")}\n` };
}

/**
 * Entry point. Runs every fixture in `FIXTURES` and reports.
 *
 * @param {{
 *   fixtures?: ReadonlyArray<typeof FIXTURES[number]>,
 *   eslintBin?: string,
 *   cwd?: string,
 *   runEslint?: (
 *     bin: string,
 *     cwd: string,
 *     vp: string,
 *     src: string,
 *   ) => { error?: Error, stdout: string, stderr: string, status: number | null },
 *   write?: (s: string) => void,
 *   writeErr?: (s: string) => void,
 * }} [io]
 * @returns {{ exitCode: 0 | 1 }}
 */
export function main(io = {}) {
  const fixtures = io.fixtures ?? FIXTURES;
  const eslintBin = io.eslintBin ?? DEFAULT_ESLINT_BIN;
  const cwd = io.cwd ?? ROOT_DIR;
  const write = io.write ?? defaultStdoutWrite;
  const writeErr = io.writeErr ?? defaultStderrWrite;
  const result = audit(fixtures, { eslintBin, cwd, runEslint: io.runEslint });
  const report = formatReport(result);
  if (report.stdout) write(report.stdout);
  if (report.stderr) writeErr(report.stderr);
  return { exitCode: report.exitCode };
}

/**
 * CLI entry. `mainImpl` is injectable so the test suite can drive the
 * exit-code wiring without spawning ESLint 32 times.
 *
 * @param {{
 *   exit?: (code: number) => void,
 *   mainImpl?: () => { exitCode: 0 | 1 },
 * }} [io]
 * @returns {void}
 */
export function cliMain(io = {}) {
  const exit = io.exit ?? ((code) => process.exit(code));
  const runMain = io.mainImpl ?? main;
  const { exitCode } = runMain();
  exit(exitCode);
}

/**
 * True when the script is being executed as a CLI.
 *
 * @param {string} importMetaUrl
 * @param {string | undefined} argv1
 * @returns {boolean}
 */
export function isCliInvocation(importMetaUrl, argv1) {
  if (argv1 === undefined || argv1 === "") return false;
  return importMetaUrl === pathToFileURL(argv1).href;
}

/**
 * Wrapped CLI dispatcher. `mainImpl` is plumbed through to `cliMain`
 * so the test suite can drive the guard branches without spawning
 * ESLint.
 *
 * @param {{
 *   importMetaUrl: string,
 *   argv1: string | undefined,
 *   exit?: (code: number) => void,
 *   mainImpl?: () => { exitCode: 0 | 1 },
 * }} io
 * @returns {boolean}
 */
export function maybeRunCli(io) {
  if (!isCliInvocation(io.importMetaUrl, io.argv1)) return false;
  cliMain({ exit: io.exit, mainImpl: io.mainImpl });
  return true;
}

maybeRunCli({ importMetaUrl: import.meta.url, argv1: process.argv[1] });
