# TEST_STACK

> Rationale for every rule: TEST_STACK.rationale.md. Coverage bar + TDD + done-claim: UNIT_COVERAGE.md. DI-vs-MSW doctrine: MOCKING_DOCTRINE.md. ---------- test stack ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## stack

- `unit_integration`: Vitest _(native ESM + TS)_
- `e2e_scripted`: Playwright _(cross-browser, free parallelization)_
- `live_browser_walkthrough`: Puppeteer _(AI-agent-driven ad-hoc; alongside Playwright (not instead))_
- `manual_api_explorer`: Swagger UI _(Chrome-extension agent drives this)_
- `http_mocks`: MSW _(intercepts at fetch/undici layer)_
- `postgres_test_db`: pglite _(in-memory; fresh per suite)_
- `mongodb_test_db`: mongodb-memory-server _(in-memory; fresh per suite)_

## permission_aware_tests

- `rule`: every test that touches a service / repository / route MUST mint a real iAuthorizedPrincipal<TSlug>
- `banned`:
  - hand-rolled fake principals
  - '"as iAuthorizedPrincipal" casts in tests'
- `use`: the `mintPrincipal` producer + appropriate slugs
- `see`: AUTHORIZATION_STANDARDS.md

## mock_seed

- `shared_baseline`:
  - `location`: src/features/shared/mocks/seed.ts
  - `purpose`: app-wide baseline (default user, default tenant, etc.)
- `per_feature`:
  - `location`: src/features/<name>/mocks/seed.ts
  - `purpose`: fixtures specific to the feature under test
- `ephemeral_db`: per-suite fresh pglite / mongodb-memory-server instance

Last updated: 2026-07-12T00:00:00Z