# scripts/verify-mode-d — push-time stamp + freshness check

## Concept

Verifier Mode B. Push-scoped stamp + freshness gate. For every feature slice touched by the current diff against `origin/master`:

1. Walk up from each changed path until we find the nearest ancestor `__specs__/standards-compliance.yaml` (`findSliceLock` / `locksFromChangedPaths`).
2. **Shape gate.** Parse each lock; assert `status: locked`, `verified: "100%"`, `last_validated` is valid ISO-8601 UTC.
3. **Freshness gate.** Ask git for the most recent commit touching the slice folder (excluding the lock itself) and compare against `last_validated + SAME_COMMIT_GRACE_MS` (re-uses `checkFreshness` from `verify-standards-freshness`).

No code execution beyond `git log`. Push-scoped: walks ONLY locks for slices in this push, not the full repo.

## Files

1. `verify-mode-d.mjs` — entry point. Exports `findSliceLock`, `locksFromChangedPaths`, `parseScalarFields`, `checkLockShape`, `main`, `cliMain`, `isCliInvocation`, `maybeRunCli`.

## Dependency injection

`parseScalarFields` parses YAML lines with regex `^([a-z_]+):\s*(.*)$` (`(.*)` so empty scalar values are legal; the earlier `(.+)` form rejected legitimate empty values and produced a dead `vRaw || ""` guard).

`maybeRunCli` accepts the full `cliMain` io (`exit`, `getChanged`, `gitLastCommit`, `write`, `writeErr`, `readFile`, `rootDir`) and forwards them through after stripping `importMetaUrl` + `argv1`. The Vitest suite drives the CLI-true branch by setting `argv1 = importMetaUrl` + supplying stubs, never spawning a real subprocess.

## Out of scope

- Per-slice gate runs (Mode A) and full-repo gates (Mode D).
- Auto-fixing stale locks — the script reports; the operator re-runs Mode A.
