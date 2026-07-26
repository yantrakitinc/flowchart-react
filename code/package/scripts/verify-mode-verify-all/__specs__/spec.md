# scripts/verify-mode-verify-all — feature-by-feature deep ceremony

## Concept

Verifier Mode Verify-All. The strongest proof in the regime — slice-by-slice unlock → Pristine+Compliance → relock, persisted to a checklist file (`.verify-all-progress.json`).

For each slice owning a `__specs__/standards-compliance.yaml`:

1. **Unlock** — flip `status: locked` → `status: unlocked` via `unlockLock` (imported from Mode A). Signals "validation in flight."
2. **Run Mode Pristine+Compliance** — spawn the composite gate. On failure, leave the slice unlocked (intentional signal: this slice did NOT pass).
3. **Relock via Mode A** — spawn `verify-mode-a.mjs <slice>` to run the slice's scoped Pristine + lock-shape gates and re-stamp on pass.
4. **Persist verdict** — write `{ slice, verdict: pass | fail, lastRun }` to `.verify-all-progress.json` immediately after each slice so a crashed / interrupted run is resumable.

On re-run with `resume: true` (default), slices already marked `pass` are skipped — a 90-minute Verify-All that died at slice 12 picks up at slice 13.

Manual / on-demand. Hours-long. The developer's pre-release / quarterly-audit gate.

## Files

1. `verify-mode-verify-all.mjs` — entry point. Exports `loadProgress`, `saveProgress`, `main`, `cliMain`, `isCliInvocation`, `maybeRunCli`.
2. `.verify-all-progress.json` — runtime artifact (gitignored). Per-slice verdict log.

## Dependency injection

`findLocks`, `slices`, `spawn`, `execPath`, `modeAPath`, `modePristineAndCompliancePath`, `unlock`, `write`, `writeErr`, `now`, `readFile`, `writeFile` are all injection ports. The `resume` flag toggles checklist consumption (defaults `true`).

## Out of scope

- Auto-restoration of a slice that failed (operator fixes the slice → re-runs Verify-All; resume picks it up).
- Random subset (Mode Verify-All-Random — separate slice composes this one).
- Cleaning the progress file (operator deletes `.verify-all-progress.json` when starting a fresh ceremony).
