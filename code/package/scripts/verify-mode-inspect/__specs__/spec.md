# scripts/verify-mode-inspect — read-only state walk

## Concept

Verifier Mode Inspect. Read-only inspection of every `<...>/__specs__/standards-compliance.yaml` lock in the repo.

For each lock found:

1. Parse the lock's scalar fields (`status`, `last_validated`).
2. If `status: locked` and `last_validated` parses as a date, ask git for the most recent commit touching the slice folder and compute freshness vs the stamp. Otherwise freshness is `unknown`.
3. Emit one line per lock with a status tag, the stamp, the relative path, and a `[STALE]` marker if the freshness gate fails.

Closes with a summary count: `<N> locked, <M> unlocked, <K> other, <S> stale`.

No mutations. No code execution beyond `git log` (via `verify-standards-freshness`). Always exits 0 — Mode Inspect is informational; the operator decides what to do with the report.

## Files

1. `verify-mode-inspect.mjs` — entry point. Exports `findAllLocks`, `inspectLock`, `formatReport`, `main`, `cliMain`, `isCliInvocation`, `maybeRunCli`.

## Dependency injection

Every filesystem read (`readDir`, `statFile`, `readFile`) and git probe (`gitLastCommit`) is an injectable IO port. The walk uses a recursive helper that returns silently on unreadable directories (a permission-denied subdirectory does not abort the walk).

`SKIP_DIRS` enumerates `node_modules`, `.next`, `.git`, `storybook-static`, `coverage`, `dist`, `build` — these are pruned at the directory level.

`maybeRunCli` forwards the full `cliMain` io (`exit`, `rootDir`, `findLocks`, `readFile`, `gitLastCommit`, `write`) after stripping `importMetaUrl` + `argv1`.

## Out of scope

- Mutating lock files — every lock-stamping op (Mode A / C / E / Verify-All) owns its own writes.
- Validating-and-failing on stale or unlocked stamps — Mode B / B.5 / D / F / F-Random own that.
- Deleting orphan locks — Mode Cleanup-Orphans owns that.
