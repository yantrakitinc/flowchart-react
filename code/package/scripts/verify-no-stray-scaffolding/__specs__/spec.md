# scripts/verify-no-stray-scaffolding — stray-scaffolding verifier

## Concept

This script keeps the codebase from carrying half-migrated spec layouts. It walks `src/` (and `e2e/` when present) and flags:

- `<folder>/flows/` directories outside a `__specs__/` parent — flow docs MUST live inside `__specs__/`.
- `<folder>/specs/`, `<folder>/__spec__/`, `<folder>/_specs_/` directories — the canonical name is `__specs__/`.
- `FLOWS.md` anywhere — there is no master flow index; AI agents crawl `__specs__/` directly.
- `CODE_CONFIDENCE.md` files outside a `__specs__/` folder.

**Backup-folder carve-out.** Folders named `__specs__.backup/` and every file inside them are skipped — operators may park legacy doc content there without tripping the gate.

Exit 0 when no strays are found. Exit 1 with a precise per-item failure list otherwise.

## Files

1. `verify-no-stray-scaffolding.mjs` — entry point. Exports pure helpers (`isInsideBackupFolder`, `classifyDirStray`, `classifyFileStray`, `audit`, `formatReport`) plus `main` / `cliMain` drivers.
2. `__tests__/verify-no-stray-scaffolding.test.mjs` — Vitest suite. Drives every helper via dependency-injected IO so the suite reaches 100/100/100/100 per-file coverage without spawning a process.
3. `__specs__/spec.yaml`, `__specs__/spec.md`, `__specs__/flows/*.flow.yaml`, `__specs__/manual/verify-no-stray-scaffolding.yaml`, `__specs__/standards-compliance.yaml`.

## Out of scope

- Validating the CONTENT of files inside `__specs__/` — that's `verify-docs` (`spec.md`, `*.flow.md` shape) and `verify-flow-coverage` (one flow doc per exported behavior).
- Validating the lock files — that's `verify-standards-compliance`.
- Auto-fixing strays. The script reports; the operator (or AI agent) decides whether to move, rename, or delete.

## Output contract

- stdout (success): `verify-no-stray-scaffolding: OK (no strays found)`
- stderr (failure): one summary line plus one line per stray:
  - `  STRAY: <relative-path> (<reason>)`
- Exit code: 0 on success, 1 on any stray.
