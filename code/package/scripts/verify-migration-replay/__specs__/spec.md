# Migration replay verifier (`pnpm verify:migration-replay`)

## Purpose

Catches pglite-incompatible migrations BEFORE they break the Vitest test suite. The script loads every `.sql` file under `src/db/migrations/` via the shared loader at `src/db/migrations/loader/loader.ts` (ADR-0003 — the single source of truth for migration parsing + pglite-incompatibility filtering), applies each statement against a fresh in-memory pglite database, and fails the build if any statement is rejected. The error output includes a preview of the failing statement and a developer-facing fix hint (today: "add the pattern to `INCOMPATIBLE_PATTERNS` in the loader" for known cases like `CREATE EXTENSION vector`).

The script is wired into `pnpm verify` via `scripts/verify-all.mjs`. CI runs it on every PR. The unit tests under `src/db/migrations/loader/__tests__/` cover the loader's split + filter logic; this script covers the END-TO-END replay against a real (in-memory) Postgres-wire engine.

## Inputs

None. The script reads no command-line flags. It reads the filesystem under `<repo>/src/db/migrations/` via the shared loader.

## Outputs

- stdout: one line on success — `verify-migration-replay: OK (<N> statement(s) applied against fresh pglite)`.
- stderr (on failure): three lines — the migration number, the failing statement's first 120 chars, and the Postgres error message; followed by one line with a suggested fix.
- Exit code: 0 on success; 1 on any failure (loader import, pglite import, statement execution, or empty replay).

## Invariants

- The script applies statements top-to-bottom in the order the loader returns. The loader returns files in lexicographic order; new migrations file names (`0008_...sql`, `0009_...sql`) MUST sort after existing ones.
- The script uses the SAME loader as the production test harness (`src/db/test/setup/setup.ts`) so a failure here implies a failure in every Vitest test that calls `createTestDb()`.
- An empty replay (zero statements returned by the loader) is an ERROR, not success. If the migrations directory has been wiped, the script refuses to claim success on the empty set.
- The script never modifies the working tree. The pglite database is created in memory and closed (best-effort) when the run completes.

## Permissions used

None. The script runs in a fresh in-memory pglite — no filesystem writes, no network, no DB access beyond the in-memory instance.

## Cross-module dependencies

- `src/db/migrations/loader/loader.ts` — the shared loader (function `loadMigrationStatements`).
- `@electric-sql/pglite` — the in-memory Postgres engine (already a devDependency).
- Node built-ins (`node:path`, `node:url`).

The script imports the loader dynamically via `import(pathToFileURL(...).href)` because it runs as a plain Node script. The pnpm script wraps the invocation in `node --import tsx` so tsx provides the on-the-fly TypeScript loader.

## Edge cases

- Migrations directory empty → script exits 1 with "the loader returned zero statements — refusing to claim success on an empty replay".
- A migration contains a statement listed in the loader's `INCOMPATIBLE_PATTERNS` (today: `CREATE EXTENSION IF NOT EXISTS pgcrypto`) → the loader drops it; the script applies the rest. PGlite-incompatible-by-design statements pass silently.
- A migration contains a NEW pglite-incompatible statement (not yet in the allowlist) → the script fails with the offending statement + a hint that suggests adding a substring to `INCOMPATIBLE_PATTERNS`.
- A migration emits SQL that pglite parses successfully but applies differently (e.g. an RLS policy that semantically requires a session variable pglite handles differently) → the script does NOT catch this; that is the integration test layer's job. The replay script is a SYNTAX + DDL-execution gate, not a semantic gate.
- The `tsx` loader is missing from `node_modules` (incomplete install) → the dynamic import of `loader.ts` fails with `Unknown file extension ".ts"`. The script catches that and prints the install-restoration hint.

## Error modes

- Loader import failure → exit 1 with "failed to import the migration loader at <path>".
- Pglite import failure → exit 1 with "failed to import `@electric-sql/pglite`" + the `pnpm install` hint.
- Loader-throw (e.g. ENOENT on the migrations directory) → exit 1 with "failed to load migrations".
- Zero statements returned → exit 1 with the empty-replay refusal message.
- A statement fails on pglite → exit 1 with the statement preview, Postgres error message, and suggested fix. The pglite instance is closed before the script exits.

## Data shape touched

- Reads: every `.sql` file under `src/db/migrations/`.
- Writes: NONE on disk. The fresh pglite database lives in memory only and is closed at the end of the run (or on the first failure).
- DB: the in-memory pglite — zero rows, zero pre-existing schema.

## Flows

- `flows/verify-migration-replay.flow.md` — the single run-once flow: import loader → import pglite → load statements → execute each → log success or fail.
