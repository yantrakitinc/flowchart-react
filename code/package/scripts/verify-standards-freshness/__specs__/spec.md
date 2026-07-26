# scripts/verify-standards-freshness — the thorough freshness gate

## Concept

For every `__specs__/standards-compliance.yaml`, ask git for the most recent commit date that touched any file in the feature folder (excluding the lock file itself). Stale = that commit date is more than `SAME_COMMIT_GRACE_MS` (5 minutes) newer than the lock's `last_validated`.

Companion to `verify-standards-compliance` (the YAML shape verifier). This script is the *thorough* check — slower because it makes one `git log` invocation per lock file. Runs on `pnpm verify:full` and CI, NOT on the default `pnpm verify` chain.

Why git history, not filesystem mtime: filesystem mtimes reset to wall-clock on every `git checkout` / `pull` / `clone`, producing false-positive staleness on every fresh clone. Git history is stable across those operations and reflects actual code change. See `.claude/standards/$1.rationale.md` — "Why git log, not filesystem mtime" — for the full rationale.

## Files

1. `verify-standards-freshness.mjs` — the script. Exports `audit`, `checkFreshness`, `defaultGitLastCommit`, `formatReport`, `main`, `cliMain`, `isCliInvocation`, `maybeRunCli`, `SAME_COMMIT_GRACE_MS`.

## Out of scope

- YAML shape validation (status:locked / verified:100% / last_validated is valid ISO-8601 UTC) — `verify-standards-compliance` owns that gate and is run first.
- Re-stamping lock files automatically — humans / agents re-stamp after their manual walk per the `editing_locked` workflow in `WRITING_ORDER.yaml`.
- GitHub API checks (remote state) — this script uses local git history; CI runs it against the checked-out commit.
- Catching un-committed source changes in the working tree — the pre-commit hook covers that case by running the chain on the staged state.
