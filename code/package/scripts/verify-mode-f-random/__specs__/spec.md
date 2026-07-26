# scripts/verify-mode-f-random — random ~20% subset of Mode F

## Concept

Verifier Mode F-Random. Composes Mode F by passing a random-sampled subset of locks through Mode F's `findLocks` injection. Uniform random sampling without replacement, fraction defaults to 0.2 (20%), minimum 1 lock sampled whenever any exist.

Use case: cheap probabilistic audit that runs as part of a routine cron / scheduled check; catches systemic stamp rot (e.g., a tool drift that's invalidated many stamps at once) without paying the full Mode F cost on every invocation.

Read-only. Refuses any sampled slice whose `status` is `unlocked` (via Mode F's shape gate).

## Files

1. `verify-mode-f-random.mjs` — entry point. Exports `DEFAULT_SAMPLE_FRACTION`, `sampleSubset`, `main`, `cliMain`, `isCliInvocation`, `maybeRunCli`.

## Dependency injection

`sampleSubset(items, fraction, rng)` is a pure function — `rng` defaults to `Math.random` but can be seeded deterministically by tests. `fraction` defaults to `DEFAULT_SAMPLE_FRACTION = 0.2`. `findLocks` defaults to `findAllLocks` from Mode Inspect. `modeF` defaults to Mode F's `main` — composition lets tests verify the wiring without re-running the full validator.

## Out of scope

- Deterministic full-repo validation (Mode F).
- Choice of sample fraction beyond CLI default (could be added via `--fraction` arg later; YAGNI for now).
- Stamp updates (Mode A / C / E).
- Random subset of deep ceremony (Mode Verify-All-Random — separate slice).
