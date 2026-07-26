# scripts/verify-mode-c — push-time slice re-verify

## Concept

Verifier Mode C. For each unique slice touched by the current diff against `origin/master`, invokes Mode A end-to-end. Opt-in at the final-push prompt for tricky / security-sensitive features.

A "slice" is the nearest ancestor folder of a changed path that has a `__specs__/standards-compliance.yaml` lock.

## Files

1. `verify-mode-c.mjs` — orchestrator. Exports `findSliceRoot`, `slicesFromChangedPaths`, `main`, `cliMain`, `isCliInvocation`, `maybeRunCli`.

## Out of scope

- Spec / code authoring (spec-writer / coder agents own that).
- Full-repo gates (Mode D handles that).
- Cross-slice dependency analysis — Mode C runs each slice in isolation.
