# scripts/verify-mode-f — entire-repo stamp + freshness check

## Concept

Verifier Mode F. Broadest read-only validator. Walks every `__specs__/standards-compliance.yaml` in the repo (via `findAllLocks` from Mode Inspect — same `SKIP_DIRS` prune) and runs the same shape + freshness gates Mode B / B.5 / D run on a narrower scope.

For each lock found:

1. **Shape gate** — `checkLockShape` from Mode D — `status: locked`, `verified: "100%"`, `last_validated` parses as ISO-8601 UTC.
2. **Freshness gate** — `checkFreshness` from `verify-standards-freshness` — most recent commit touching the slice ≤ `last_validated + SAME_COMMIT_GRACE_MS`.

Read-only. Refuses any slice whose `status` is `unlocked` (caught by the shape gate).

## Files

1. `verify-mode-f.mjs` — entry point. Exports `main`, `cliMain`, `isCliInvocation`, `maybeRunCli`.

## Dependency injection

`findLocks` defaults to `findAllLocks` (Mode Inspect's filesystem walker). `gitLastCommit` defaults to `defaultGitLastCommit` from `verify-standards-freshness`. `readFile` injects through `checkLockShape`. Tests / Mode F-Random override `findLocks` to inject a specific subset (e.g., a random sample).

## Out of scope

- Narrower scopes (Mode B / B.5 / D).
- Random subset (Mode F-Random — separate slice that composes Mode F).
- Stamp updates (Mode A / C / E).
- Auto-fixing stale locks.
