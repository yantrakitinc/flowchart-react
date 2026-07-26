# scripts/verify-mode-e — entire-repo stamp update

## Concept

Verifier Mode E. Broader sibling of Mode C — fans Mode A across every slice in the repo, not just slices touched by `origin/master..HEAD`.

1. Walk every `__specs__/standards-compliance.yaml` via `findAllLocks` (Mode Inspect).
2. Derive each slice root by stripping `__specs__/standards-compliance.yaml` from the lock path (`slicesFromLocks`).
3. For each slice, spawn `verify-mode-a.mjs <slice>` with the project node binary. Capture stdout/stderr and per-slice exit code.
4. Aggregate: overall exit 0 iff every slice passed.

Use case: after a sweeping change that invalidates many stamps at once — a verifier-mode rework, a new lint rule, a test-framework migration. Mode E is the only way to re-stamp the whole repo without manually visiting every slice.

## Files

1. `verify-mode-e.mjs` — entry point. Exports `slicesFromLocks`, `main`, `cliMain`, `isCliInvocation`, `maybeRunCli`.

## Dependency injection

`spawn` defaults to `spawnSync`; tests inject a stub. `findLocks` defaults to `findAllLocks` from Mode Inspect. `modeAPath` defaults to the project's `scripts/verify-mode-a/verify-mode-a.mjs` and can be overridden for tests.

## Out of scope

- Narrower stamp-update scopes (Mode A per slice, Mode C per branch).
- Validators (Mode B / B.5 / D / F / F-Random).
- Deep ceremony (Mode Verify-All).
