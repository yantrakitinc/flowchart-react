# NO_THEATER_TESTS

> Rationale for every rule: NO_THEATER_TESTS.rationale.md. Dependency injection the pattern_c fix relies on: MOCKING_DOCTRINE#refactor-to-testability. Coverage bar gate 1 enforces: UNIT_COVERAGE#coverage. Done-claim proof: UNIT_COVERAGE#done-claim. ---------- no theater tests ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## no_theater_tests

- `banned_patterns`:
  - `pattern_a`:
    - `name`: lone .not.toThrow()
    - `example`: "expect(() => fn()).not.toThrow();  // no other assertion"
    - `fix`: assert the actual state change / return value
  - `pattern_b`:
    - `name`: safety-counter loops
    - `example`: "while (counter-- > 0 && condition) { ... }  // passes whether or not condition was met"
    - `fix`: use waitFor / explicit timeout with proper failure
  - `pattern_c`:
    - `name`: self-mocked function under test
    - `example`: "vi.mock(`../<basename>`)  // where basename is the file under test"
    - `fix`: don't mock the function under test; inject its dependencies instead (see MOCKING_DOCTRINE#refactor-to-testability)
- `test_for_theater`: if you delete the production code and the test still passes, it's theater

## two_gate_discipline

- `gate_1`:
  - `name`: pnpm verify
  - `invocation`: pre-push hook + CI + ad-hoc local
  - `runs`:
    - verify-standards-compliance _(presence + freshness; see LOCK_FILES.md)_
    - typecheck
    - lint
    - test (with --coverage; 100% perFile — see UNIT_COVERAGE#coverage)
    - e2e (Playwright)
    - boot-smoke (when dev server is the deploy target)
- `gate_2`:
  - `name`: pnpm verify:full
  - `invocation`: LOCAL ONLY (not CI; not GitHub Actions; not pre-push)
  - `runs_everything_in_gate_1_plus`:
    - puppeteer walkthroughs against the local dev server
    - heavy live-DB integration tests
    - any check that requires the operator to be at the keyboard
  - `rule`: NEVER run from CI; explicitly local-only
- `exit_required`: gate 1 exits 0 before push; gate 2 exits 0 before claiming "fully verified"

Last updated: 2026-07-12T00:00:00Z