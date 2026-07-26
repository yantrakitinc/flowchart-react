# UNIT_COVERAGE

> Rationale for every rule: UNIT_COVERAGE.rationale.md. Siblings (cite, never restate): TEST_STACK.md (runners/mocks/dbs), MOCKING_DOCTRINE.md (DI vs MSW + refactor-to-testability), SCENARIO_ENUMERATION.md (path categories), STORYBOOK_TESTING.md (component two-way coverage), NO_THEATER_TESTS.md (theater bans + gates). ---------- coverage ----------

```meta
version: 1
last_updated: 2026-07-16T00:00:00Z
```

## coverage

- `threshold`: 100% _(lines / branches / functions / statements)_
- `perFile`: true _(not aggregate; every measured file 100%)_
- `enforced_by`: vitest coverage.thresholds (100, perFile:true) — the verify chain FAILS below 100%; an unconfigured threshold is a defect, not a pass
- `gate`: scripts/verify/verify-coverage-threshold.mjs _(asserts the vitest config actually sets 100 perFile (catches absent/lowered/non-perFile thresholds))_
- `cant_reach_100_percent`: split the file or refactor for testability (see MOCKING_DOCTRINE#refactor-to-testability)
- `skip_exception`: physically or mathematically impossible only
- `banned_excuses`:
  - too long
  - too many tests required
  - improbable
- `measured`: ALL of src/**/*.{ts,tsx} — every file 100% perFile, including Drizzle schemas (declare FKs via foreignKey() in the table-config callback so they execute + cover, NOT inline .references(() => …) which only runs at migration-gen) and the app shell (route/layout/page — call the component fns / render them)
- `not_measured`: _(the DEFINITION of the measured set (non-product-code), not an exclusion of logic files)_
  - "**/__tests__/**, **/*.test.*" _(the tests themselves)_
  - "**/__stories__/**, **/*.stories.*" _(stories (covered by addon-a11y + storybook-docs gate))_
  - "**/__specs__/**" _(yaml/md specs, not code)_
  - "**/*.config.*, **/*.d.ts" _(config + type-only decls (no runtime))_
- `banned`: adding ANY source file to not_measured to dodge the bar; only the four non-product-code classes above are out. Can't reach 100%? refactor for testability (e.g. FKs → foreignKey() form) — never exclude
- `see`: LOCK_FILES.md

## tdd

- `rule`: write the failing test FIRST; observe red; write minimum code to pass; observe green
- `banned`: code-first then test (even if the resulting test passes)
- `exception`: a test for an existing untestable function may be added during a refactor-to-testability slice without prior red — note in the commit

## every_export_tested

- `rule`: every exported behavior function has ≥ 1 unit test
- `test_names`: human-readable behavior descriptions, not "test 3"
- `required_per_function`:
  - happy-path
  - every declared error path (from flow.yaml.throws)
  - every distinct edge case (from flow.yaml.paths.edge_*)

## naming

- `see`: TEST_NAMING.md _(path-derived global test IDs (unit:<feature-path>/...); discovery globs)_

## e2e_per_surface

- `authority`: E2E_TESTING.md _(E2E structure (scenario/flow folders), placement, db-safety, seeding, run modes live there. THIS section keeps only the unit-standard gate: a feature is not done until its E2E is green.)_
- `rule`: every flow that exercises business logic has ≥ 1 real end-to-end test that drives it through its ACTUAL surface and asserts the persisted side-effect. A feature is NOT done until this E2E exists and is green — no matter how green the unit tests are.
- `driven_through_the_real_transport`: the E2E goes over the wire / through the browser. Calling a route handler or service function in-process is INTEGRATION, not E2E, and does NOT satisfy this rule. 200 OK / a returned value without a verified DB change is the silent-failure mode this rule exists to catch.
- `two_modes_by_surface`:
  - `api_only`:
    - `applies_when`: "the app is UI-deferred / API-only (autonomy.yaml ui_discipline: none, or a phase that ships no UI yet)"
    - `how`: boot the real server on a dedicated port and call the HTTP route(s) with real HTTP requests (fetch/curl) — not in-process handler calls
    - `example_harness`: a node script wired into `pnpm e2e` that spawns the server, polls readiness, hits the endpoints, asserts, tears down
  - `ui_present`:
    - `applies_when`: "the app ships any UI surface (autonomy.yaml ui_discipline: crappy-permitted | full)"
    - `how`: drive the real UI in a browser via Puppeteer (gate 2 / verify:full) and/or Playwright (gate 1) — click/type the actual flow a user would. Even when the same operation also has an HTTP route, the user-facing flow is exercised FROM THE UI, not only via the API.
- `must_assert`:
  - transport — the response shape / the rendered result the caller sees
  - state_added — query the DB directly and confirm the expected row(s) were created (and updated rows reflect the change)
  - state_removed_on_teardown — after cleanup, query again and confirm 0 rows remain (proves isolation + no leakage)
- `isolation`:
  - `rule`: each E2E run is self-contained and idempotent — dedicated port, dedicated throwaway tenant/account/test-data ids, seed-with-clean-first, and a finally-block teardown that removes everything it created
  - `verify_cleanup`: the test asserts post-teardown that its rows are gone (a leaked row fails the run)
  - `db`: a dedicated test DB (per-run container OR per-suite truncate) where available; otherwise a fully-scoped throwaway tenant that the teardown deletes
- `banned`:
  - `stub_e2e`: an e2e script that echoes / exits 0 without running the flow is FORBIDDEN — it is a lie about coverage
  - `in_process_only`: claiming E2E while only invoking handlers/services in-process (no real transport)
  - `response_only_assertion`: asserting the HTTP status / return value without asserting the persisted DB side-effect
- `wired_into`: "`pnpm e2e` (gate 1) for api_only HTTP E2E + Playwright UI E2E; `pnpm verify:full` (gate 2) for Puppeteer UI walkthroughs"
- `folder_location`: e2e/ at top level, parallel to src/ (api_only HTTP harnesses may live under e2e/ as .e2e.mjs scripts)

## done_claim

- `rule`: NEVER claim done / complete / finished without quoted proof
- `quoted_proof`: verbatim final-line output of `pnpm verify` (and `pnpm verify:full` for fully-verified claims)
- `see`: LOCK_FILES.md (the lock file is the durable record of done)

Last updated: 2026-07-16T00:00:00Z