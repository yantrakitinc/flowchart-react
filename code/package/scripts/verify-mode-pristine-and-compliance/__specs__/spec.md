# scripts/verify-mode-pristine-and-compliance — pre-merge composite gate

## Concept

Verifier Mode Pristine+Compliance. Composes Mode Pristine and Mode Compliance:

1. Spawn `verify-mode-pristine.mjs`. On non-zero, stop and exit 1.
2. Spawn `verify-mode-compliance.mjs`. On non-zero, exit 1. On zero, exit 0.

Manual / on-demand. The developer's pre-merge gate. Pristine first because the cheaper checks (typecheck / lint) catch faster than the 11-script Compliance chain.

## Files

1. `verify-mode-pristine-and-compliance.mjs` — entry point. Exports `main`, `cliMain`, `isCliInvocation`, `maybeRunCli`.

## Dependency injection

`spawn`, `execPath`, `cwd`, `modePristinePath`, `modeCompliancePath` are all injection ports. Defaults resolve to the canonical script paths under `frontend/scripts/`.

## Out of scope

- Per-slice unlock/relock (that's Mode Verify-All).
- Re-stamping (Mode A / C / E).
- Stamp validation (Mode B / B.5 / D / F / F-Random).
