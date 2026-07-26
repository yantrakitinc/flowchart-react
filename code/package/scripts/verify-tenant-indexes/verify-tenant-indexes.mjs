#!/usr/bin/env node
// migration-lint gate that asserts every tenant-scoped table in
// `src/db/` ships at least one index-shaped object (PK, unique, composite
// unique, unique-index, or plain index) whose LEADING column is the tenant
// key. The rule is spelled out in the tenant-index rule (AUTHORIZATION_STANDARDS.yaml).
//
// "Tenant-scoped" is detected by a narrow heuristic — a non-`users` table
// that declares a column whose Postgres-side name is `creator_id`,
// `tenant_id`, `owner_id`, or `user_id`. The heuristic is intentionally
// narrow so it cannot false-positive on unrelated tables. Tables that carry
// a non-canonical tenant axis (e.g. `youtube_videos.channel_id`) are out of
// scope for the auto-detect; add them to the explicit-tenant overrides
// section below when they arrive.
//
// The script is plain Node + zero dependencies — runs everywhere the verify
// chain runs. It reads Drizzle schema files directly off disk and parses
// the pgTable + index declarations with deliberately narrow regexes that
// match the style locked across the codebase.
//
// Wired into `pnpm verify` via scripts/verify-all.mjs.

import { readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { listAllFiles } from "../lib/walk.mjs";

const ROOT = new URL("../..", import.meta.url).pathname;
const SCHEMA_GLOB_ROOT = join(ROOT, "src", "db");

/**
 * The four column names the heuristic treats as a tenant key. Keep this
 * set narrow on purpose — see the tenant-index rule (AUTHORIZATION_STANDARDS.yaml) for why broader detection
 * (FK-walking, identifier-fuzzing) was rejected.
 */
const TENANT_KEY_COLUMNS = new Set([
  "creator_id",
  "tenant_id",
  "owner_id",
  "user_id",
]);

/**
 * Tables whose name matches one of these is exempt from the gate. The
 * root identity row (`users`) is the canonical exemption — its tenant
 * axis is its own `id`, not a foreign key column.
 */
const EXEMPT_TABLES = new Set(["users"]);

/**
 * Returns true when the file is a Drizzle schema source file (production
 * code under any `schemas/` directory inside `src/db/`) and NOT a test or
 * `__specs__` file.
 *
 * @param {string} absPath
 * @returns {boolean}
 */
function isSchemaFile(absPath) {
  if (!absPath.endsWith(".ts")) return false;
  if (absPath.includes("/__tests__/")) return false;
  if (absPath.includes("/__specs__/")) return false;
  if (absPath.includes("/schemas/") === false) return false;
  return true;
}

/**
 * Parses a single Drizzle schema source file and returns the parsed
 * shape. Returns `null` when the file does not declare a `pgTable`
 * (e.g. a barrel re-export).
 *
 * The parser is narrow on purpose — it matches the locked codebase style
 * (Drizzle imports from `drizzle-orm/pg-core`, the `pgTable("name", { ...
 * }, (t) => [ ... ])` 3-arg form, columns declared as `camel: type("snake")`,
 * indexes declared via `index(...).on(t.col, ...)` / `uniqueIndex(...).on(
 * t.col, ...)` / `unique(...).on(t.col, ...)` / `primaryKey({ columns:
 * [t.col, ...] })`).
 *
 * @param {string} absPath
 * @returns {{
 *   tableName: string,
 *   columns: Array<{ tsName: string, dbName: string }>,
 *   indexHeads: string[],
 * } | null}
 */
function parseSchemaFile(absPath) {
  const src = readFileSync(absPath, "utf8");

  // Find the pgTable declaration. We accept either `pgTable("name",` or
  // `pgTable( "name",` (mild whitespace). The capture group is the table
  // name.
  const tableMatch = /pgTable\(\s*"([^"]+)"/.exec(src);
  if (!tableMatch) return null;
  const tableName = tableMatch[1];

  // Extract the column declarations. Drizzle's pattern is one column per
  // line, indented inside the column-object literal. We match
  //   <camelName>: <something>("<snake_name>"
  // where `<something>` is one of the known Drizzle column constructors.
  // The regex captures the camelCase TS name and the snake_case DB name.
  // It deliberately does not try to parse the trailing modifier chain.
  const columns = [];
  const colRe =
    /(\s)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:uuid|text|boolean|integer|bigint|timestamp|jsonb|date)\s*\(\s*"([^"]+)"/g;
  let cm;
  while ((cm = colRe.exec(src)) !== null) {
    columns.push({ tsName: cm[2], dbName: cm[3] });
  }

  // Extract every index/unique/uniqueIndex/primaryKey expression and pull
  // out the LEADING column reference. We accept these shapes:
  //
  //   index("name").on(t.col1, ...)
  //   uniqueIndex("name").on(t.col1, ...)
  //   unique("name").on(t.col1, ...)
  //   primaryKey({ columns: [t.col1, ...] })
  //
  // For each, we capture the FIRST column referenced. Column-level
  // chained `.unique()` (e.g. `slug: text("slug").notNull().unique()`)
  // creates an implicit unique index on the column itself — the script
  // handles that separately below.
  const indexHeads = [];

  const onFirstRe = /(?:index|uniqueIndex|unique)\([^)]*\)\s*\.on\(\s*t\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  let im;
  while ((im = onFirstRe.exec(src)) !== null) {
    indexHeads.push(im[1]);
  }

  const pkRe = /primaryKey\(\s*\{\s*columns\s*:\s*\[\s*t\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  let pm;
  while ((pm = pkRe.exec(src)) !== null) {
    indexHeads.push(pm[1]);
  }

  // Single-column PRIMARY KEY via the column-level `.primaryKey()` chain.
  // Drizzle's chain can span multiple lines:
  //
  //   id: uuid("id").primaryKey()
  //   userId: uuid("user_id")
  //     .primaryKey()
  //     .references(() => users.id, { onDelete: "cascade" }),
  //
  // We split the file into column-declaration "regions" and check each
  // region for the `.primaryKey()` and `.unique()` tokens. A region runs
  // from one `<camel>: <type>("<snake>")` constructor to the next, or to
  // the start of the indexes-closure `(t) => [`. Region-scoped scanning
  // avoids the ambiguity of a global regex that might match a
  // `.primaryKey()` belonging to a later column.
  const colDeclRe =
    /(\s)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:uuid|text|boolean|integer|bigint|timestamp|jsonb|date)\s*\(\s*"([^"]+)"\s*\)/g;
  const regions = [];
  let lastDecl = null;
  let cm2;
  while ((cm2 = colDeclRe.exec(src)) !== null) {
    if (lastDecl !== null) {
      regions.push({
        tsName: lastDecl.tsName,
        dbName: lastDecl.dbName,
        start: lastDecl.end,
        end: cm2.index,
      });
    }
    lastDecl = { tsName: cm2[2], dbName: cm2[3], end: cm2.index + cm2[0].length };
  }
  // Cap the last region at the start of the indexes-closure (or EOF). The
  // indexes closure is `,\n  (t) => [` in the locked Drizzle style.
  if (lastDecl !== null) {
    const closureStart = src.indexOf("(t) =>", lastDecl.end);
    regions.push({
      tsName: lastDecl.tsName,
      dbName: lastDecl.dbName,
      start: lastDecl.end,
      end: closureStart === -1 ? src.length : closureStart,
    });
  }

  for (const r of regions) {
    const slice = src.slice(r.start, r.end);
    if (/\.primaryKey\(\)/.test(slice)) {
      indexHeads.push(r.tsName);
    }
    if (/\.unique\(\)/.test(slice)) {
      indexHeads.push(r.tsName);
    }
  }

  return { tableName, columns, indexHeads };
}

/**
 * Walks every schema file, parses it, and returns the audit findings.
 *
 * @returns {{
 *   checked: number,
 *   tenantScoped: number,
 *   offenders: Array<{
 *     tableName: string,
 *     filePath: string,
 *     tenantKey: string,
 *     indexHeadsSeen: string[],
 *   }>,
 * }}
 */
function audit() {
  const files = listAllFiles(SCHEMA_GLOB_ROOT).filter(isSchemaFile);
  let tenantScoped = 0;
  const offenders = [];

  for (const file of files) {
    const parsed = parseSchemaFile(file);
    if (parsed === null) continue;
    if (EXEMPT_TABLES.has(parsed.tableName)) continue;

    // Find the tenant key column on this table (if any).
    const tenantCol = parsed.columns.find((c) =>
      TENANT_KEY_COLUMNS.has(c.dbName),
    );
    if (!tenantCol) continue;

    tenantScoped += 1;

    // The index heads we captured are TS-camel names. Translate them to
    // DB-snake names via the columns map for the comparison.
    const tsToDbName = new Map(
      parsed.columns.map((c) => [c.tsName, c.dbName]),
    );
    const indexHeadsDb = parsed.indexHeads
      .map((tsName) => tsToDbName.get(tsName))
      .filter((x) => x !== undefined);

    const isCovered = indexHeadsDb.includes(tenantCol.dbName);
    if (!isCovered) {
      offenders.push({
        tableName: parsed.tableName,
        filePath: relative(ROOT, file),
        tenantKey: tenantCol.dbName,
        indexHeadsSeen: indexHeadsDb,
      });
    }
  }

  return { checked: files.length, tenantScoped, offenders };
}

function main() {
  const result = audit();
  if (result.offenders.length === 0) {
    console.log(
      `verify-tenant-indexes: OK (${String(result.checked)} schema file(s); ${String(result.tenantScoped)} tenant-scoped table(s) checked, all carry a tenant-leading index)`,
    );
    return;
  }

  console.error(
    `verify-tenant-indexes: ${String(result.offenders.length)} tenant-scoped table(s) lack a tenant-leading index`,
  );
  for (const o of result.offenders) {
    console.error(`  - ${o.tableName} (${o.filePath})`);
    console.error(`      tenant key: ${o.tenantKey}`);
    const seen =
      o.indexHeadsSeen.length === 0
        ? "(none)"
        : o.indexHeadsSeen.join(", ");
    console.error(`      index heads seen: ${seen}`);
    console.error(
      `      Suggested: add \`index("${o.tableName}_${o.tenantKey}_idx").on(t.${camelCase(o.tenantKey)})\` (or a composite \`.on(t.${camelCase(o.tenantKey)}, t.createdAt)\` if you order by created_at) to the table's index closure. See the tenant-index rule (AUTHORIZATION_STANDARDS.yaml).`,
    );
  }
  process.exit(1);
}

/**
 * Tiny snake_case -> camelCase converter for the suggestion hint.
 *
 * @param {string} snake
 * @returns {string}
 */
function camelCase(snake) {
  return snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

main();
