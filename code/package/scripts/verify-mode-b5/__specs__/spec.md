# scripts/verify-mode-b5 — uncommitted-working-tree stamp + freshness check

## Concept

Verifier Mode B.5. Scope is the working tree state — staged, unstaged, and untracked-but-not-ignored — via `git status --porcelain=v1`. For each path, resolve to its owning slice's lock (reused `locksFromChangedPaths` from Mode D) and run the standard shape + freshness gates.

The use case: catch stamps that haven't been re-validated for the edits sitting in your working tree, BEFORE you stage them. Mode B (HEAD-only) catches the same problem one commit later.

Read-only. No mutations.

## Files

1. `verify-mode-b5.mjs` — entry point. Exports `getWorkingTreeChangedPaths`, `main`, `cliMain`, `isCliInvocation`, `maybeRunCli`.

## Dependency injection

`getWorkingTreeChangedPaths` accepts an `exec` injection (default: `execFileSync`); parses porcelain v1 output and handles rename rows (`old -> new` — keeps the new path). The git failure case returns `[]` (main reports "nothing to check").

Mode B.5 delegates per-lock checks to Mode D's `locksFromChangedPaths` + `checkLockShape`. The three validators (Mode B / B.5 / D) diverge only in `getChanged`.

## Out of scope

- Other validation scopes (Mode B / D / F / F-Random).
- Stamp updates (Mode A / C / E).
- Auto-fixing stale locks.
