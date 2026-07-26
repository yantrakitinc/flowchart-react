# scripts/verify-mode-b — HEAD-only stamp + freshness check

## Concept

Verifier Mode B. Narrower sibling of Mode D — scope is HEAD vs HEAD~1 (the most recent commit), not the full branch diff.

For each path changed in HEAD:

1. Walk up to the nearest ancestor `__specs__/standards-compliance.yaml` (reused `findSliceLock` / `locksFromChangedPaths` from Mode D).
2. **Shape gate** — `checkLockShape` from Mode D — assert `status: locked`, `verified: "100%"`, `last_validated` parses as ISO-8601 UTC.
3. **Freshness gate** — `checkFreshness` from `verify-standards-freshness` — most recent commit touching the slice (excluding the lock itself) is ≤ `last_validated + SAME_COMMIT_GRACE_MS`.

Read-only. No mutations. Refuses to validate any slice whose `status` is `unlocked`.

## Files

1. `verify-mode-b.mjs` — entry point. Exports `getHeadChangedPaths`, `main`, `cliMain`, `isCliInvocation`, `maybeRunCli`.

## Dependency injection

`getHeadChangedPaths` accepts an `exec` injection (default: `execFileSync`) so the diff-tree call is testable without spawning git. The `git` failure case (root commit, missing git) returns `[]` — main treats this as "nothing to check".

Mode B delegates per-lock checks to Mode D's exported helpers (`locksFromChangedPaths`, `checkLockShape`). The two modes diverge only in `getChanged` (HEAD vs `origin/master..HEAD`).

## Out of scope

- Branch-level validation (Mode D).
- Entire-repo validation (Mode F, F-Random).
- Stamp updates (Mode A / C / E).
- Auto-fixing stale locks — script reports; operator re-runs Mode A.
