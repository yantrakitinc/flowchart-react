# scripts/verify-mode-verify-all-random — random ~20% subset of Mode Verify-All

## Concept

Verifier Mode Verify-All-Random. Composes Mode Verify-All by passing a random-sampled slice subset via the `slices` injection. Uniform random without replacement, fraction defaults to 0.2, minimum 1 slice sampled whenever any exist.

Use case: a cheap probabilistic deep audit. The full Mode Verify-All takes hours; the random subset takes a fraction of that and catches systemic drift (a sweeping refactor that invalidated many slices) without paying the full cost on every cron.

## Files

1. `verify-mode-verify-all-random.mjs` — entry point. Exports `DEFAULT_SAMPLE_FRACTION`, `main`, `cliMain`, `isCliInvocation`, `maybeRunCli`.

## Dependency injection

`findLocks`, `fraction`, `rng`, `verifyAll`, plus everything passed through to Mode Verify-All. `sampleSubset` is reused from Mode F-Random.

## Out of scope

- Deterministic deep ceremony (Mode Verify-All).
- Stamp-only updates (A / C / E) or validators (B / B.5 / D / F / F-Random).
