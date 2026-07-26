# Tenant-composite-index verifier (`pnpm verify:tenant-indexes`)

## Purpose

Asserts every tenant-scoped table in `src/db/` ships at least one index-shaped object (primary key, unique constraint, unique index, or plain index) whose **leading column** is the table's tenant key. The rule lives in the tenant-index rule (AUTHORIZATION_STANDARDS.yaml).

Tenant detection heuristic: a non-`users` table that declares a column named `creator_id`, `tenant_id`, `owner_id`, or `user_id`. The four names are the canonical tenant axes in this codebase. Tables whose tenant axis is named differently (e.g. `youtube_videos.channel_id` carries the YouTube-platform tenant axis, not the dashboard's `creator_id` axis) are NOT caught by the heuristic by design — the rule is narrow on purpose so it cannot false-positive on unrelated tables.

The script is wired into `pnpm verify` via `scripts/verify-all.mjs`. CI gates on it. It is plain Node + zero dependencies and runs everywhere the verify chain runs.

## Inputs

None. The script reads no command-line flags. It walks `src/db/` and reads every `*.ts` file under any `schemas/` directory.

## Outputs

- stdout (on success): one line — `verify-tenant-indexes: OK (<N> schema file(s); <M> tenant-scoped table(s) checked, all carry a tenant-leading index)`.
- stderr (on failure): one summary line plus per-offender block listing the table name, schema file path, tenant key column, index heads observed, and a copy-pasteable suggestion. Exit code 1.
- Exit code: 0 on success; 1 when any tenant-scoped table lacks a tenant-leading index.

## Invariants

- The walk is deterministic — `listAllFiles` returns files in filesystem order; each file is parsed independently.
- The script never modifies the working tree. It is read-only.
- The heuristic is intentionally narrow: a table is tenant-scoped if and only if it declares a column whose snake-case DB name is `creator_id`, `tenant_id`, `owner_id`, or `user_id` AND the table is not on the `EXEMPT_TABLES` allowlist (today: `users`).
- A table whose tenant axis is named differently passes silently (not flagged). The trade-off is documented in the tenant-index rule (AUTHORIZATION_STANDARDS.yaml): false-negatives are the explicit cost of the narrow heuristic, and the script's expected-tables list is the escape hatch when one arrives.
- A composite PK whose leading column is the tenant key satisfies the rule. A composite unique whose leading column is the tenant key satisfies the rule. A single-column index on the tenant key alone satisfies the rule.

## Permissions used

None. Filesystem-only. No DB access, no network.

## Cross-module dependencies

- `scripts/lib/walk.mjs` — the file-system walker shared with the other `verify-*.mjs` scripts.
- Node built-ins (`node:fs`, `node:path`, `node:url`).

The script does NOT depend on `drizzle-orm`, `tsx`, or any TypeScript compiler — it parses Drizzle schemas directly via narrow regexes matched to the locked codebase style (`pgTable("name", { ... }, (t) => [ ... ])`).

## Edge cases

- A schema file that is a barrel re-export (no `pgTable(...)` call) → the parser returns `null`; the file is skipped silently.
- A table with no tenant-key column → not flagged.
- A tenant-key column that is part of a composite PK / composite unique whose leading column is a DIFFERENT column → FLAGGED. The rule requires the tenant key to be the LEADING column of at least one index-shaped object.
- A tenant-key column declared via a non-standard Drizzle column constructor (one not in the recognized list: `uuid`, `text`, `boolean`, `integer`, `bigint`, `timestamp`, `jsonb`, `date`) → not detected; the column-extraction regex doesn't match. When a new column type lands, the regex list is updated alongside.
- The `users` table — its tenant axis is its own `id`. Exempt via `EXEMPT_TABLES`. The exemption is by table name, not by file path.
- Multi-line column-declaration chains (e.g. `userId: uuid("user_id")\n  .primaryKey()\n  .references(...)`) — handled via region-scoped scanning, not a single-line regex.

## Error modes

- The script does not throw. Parse failures on a non-pgTable file return `null` and the file is skipped.
- If `listAllFiles` returns zero schema files (e.g. `src/db/` is missing), the script exits 0 with "0 tenant-scoped table(s) checked" — this is by-design a no-op success. The migration-replay verifier already catches the empty-migrations case; this script does not need to redundantly do the same check.

## Data shape touched

- Reads: every `*.ts` file under any `schemas/` directory inside `src/db/`.
- Writes: NONE on disk. stdout / stderr only.

## Flows

- `flows/verify-tenant-indexes.flow.md` — the single run-once flow: walk schema files, parse each, identify tenant-scoped tables, assert each carries a tenant-leading index head, exit accordingly.

## Follow-up

When a table with a non-canonical tenant axis arrives (e.g. `youtube_videos.channel_id`, `accounts.workspace_id`), add an entry to the script's expected-tables list AND add the matching composite index in the same migration. The script's `EXEMPT_TABLES` set covers the inverse case (tables that look tenant-scoped but aren't); the analogous "non-canonical tenant" override would need a small data structure (e.g. `{ tableName: 'youtube_videos', tenantKey: 'channel_id' }`) added inline. That follow-up will land alongside the first such table.
