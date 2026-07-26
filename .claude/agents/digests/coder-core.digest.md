# DIGEST for coder-core.md — GENERATED, do not edit. Regenerate: node ~/.claude/standards/scripts/generate/generate-agent-digests.mjs
# sources:
#   STACK.md 726fb2827de1e433
#   TYPESCRIPT_HYGIENE.md f6251ebc91a7a7be
#   NAMING.md d1b0e4ffa6aad9e0
#   CODE_DOCUMENTATION.md d044e89a8ae184bc
#   LOGGING.md 135c823231b6375d
#   DESIGN_TOKENS.md 9d96c39b580a93e0
#   UTC_TIMESTAMPS.md 56464f44694050c8
#   SOURCE_FOLDERS.md ad7634d3c10ba7d8
#   HEXAGONAL_ARCHITECTURE.md 5cb59d8615a9a0db
#   UNIT_COVERAGE.md 8a921b7cf07799ee
#   TEST_STACK.md 3dec06bb9c959234
#   MOCKING_DOCTRINE.md 4235cbbc2bd946d6
#   SCENARIO_ENUMERATION.md d10bae04e3845456
#   NO_THEATER_TESTS.md 03759084edd3f091
#   STATE_VOCABULARY.md c4b349d2a45267df
#   WRITING_ORDER.md 9ae74b0a72d2637d
#   DECISION_LOG.md 6e66ab4cda731377
#   BROWSER_VALIDATION.md a147729c5772a6f9
#   API_ENVELOPE.md c5c9c462f3c0ed0f
#   API_FIRST.md 2adc47de1ac4aaf5
#   REQUIREMENTS_CONTRACT.md 5c24e6a9b4fa0a1e
#   CONTEXT_ECONOMY.md 7937af1a8307570f

## ═══ STACK.md ═══

```markdown
# STACK

> Rationale for every rule: STACK.rationale.md. ---------- stack (Next.js-first; per-project override allowed with a documented reason) ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## stack

- `framework`: Next.js (App Router)
- `ui`: React + Tailwind v4 (+ @tailwindcss/postcss) _(token discipline: DESIGN_TOKENS#tailwind)_
- `language`: TypeScript (strict) _(hygiene rules: TYPESCRIPT_HYGIENE#typescript)_
- `database`: PostgreSQL _(MongoDB allowed for projects that justify it)_
- `orm`: Drizzle ORM + postgres-js
- `test_db`: pglite _(in-memory Postgres for unit; real Postgres for integration)_
- `auth_tokens`: PASETO v4 (HttpOnly cookie; never JS-readable storage)
- `password_hashing`: Argon2id (RFC 9106)
- `logger`: Pino _(usage rules: LOGGING#logging)_
- `package_manager`: pnpm
- `override_rule`: a project may pick a different stack item if the spec documents the reason
- `see`: INDUSTRY_STANDARDS_STACK.md _(named-standard catalog)_

## see_also

- `agent_standards`: SPEC_CONTRACT.md + FLOW_CONTRACT.md + MANUAL_FLOWS.md + AGENT_AFFORDANCES.md # spec.md / flows / manual / data-* attributes
- `standards_compliance`: LOCK_FILES.md # per-feature lock + freshness gate (the only verify script)
- `cross_cutting_concerns`: SPEC_CONTRACT#cross-cutting-declaration _(WCAG / auth / mobile / i18n)_
- `authorization_standards`: AUTHORIZATION_STANDARDS.md _(Layer A + Layer B + YAML→RLS DSL + actor model + bootstrap chain)_
- `process_discipline`: PROCESS_DISCIPLINE.md _(scope / defects / order / DB hygiene / decision boundary)_

## verification

see LOCK_FILES.md _(the only standards-verify script + manual walk)_

Last updated: 2026-07-12T00:00:00Z
```

## ═══ TYPESCRIPT_HYGIENE.md ═══

```markdown
# TYPESCRIPT_HYGIENE

> Rationale for every rule: TYPESCRIPT_HYGIENE.rationale.md. ---------- TypeScript ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## typescript

- `strict`: true _(strict + strict null checks)_
- `any`: forbidden _(use `unknown` + narrowing)_
- `ts_ignore`: forbidden _(both @ts-ignore AND @ts-expect-error (outside __tests__/))_
- `eslint`: eslint-config-next + zero warnings (not just zero errors)

## types

- `co_location`: types live with the runtime code that owns them
- `banned`:
  - <name>.types.ts
  - per-folder types.ts for feature-internal types
- `export_rule`: only `export` a type/interface/class if another file imports it
- `exceptions`:
  - shared cross-feature contracts → dedicated file (e.g. src/lib/api/result.ts, <feature>/types/domain.ts)
  - ORM-schema-inferred types → stay as expressions on the schema export
  - generated types (codegen / CMS) → dedicated dirs

## verification

see LOCK_FILES.md

Last updated: 2026-07-12T00:00:00Z
```

## ═══ NAMING.md ═══

```markdown
# NAMING

> Rationale for every rule: NAMING.rationale.md. ---------- naming ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## naming

- `interfaces_and_types`: prefix `i` _(iUser)_
- `classes`: suffix `Class` _(AuthServiceClass)_
- `constants_literal`: ALL_CAPS _(MAX_LOGIN_ATTEMPTS)_
- `files`:
  - `components`: PascalCase _(LoginForm.tsx)_
  - `utilities_services_hooks`: camelCase or dot-case _(auth.service.ts, useSession.ts)_
- `primary_keys`: CUID2 (@paralleldrive/cuid2)
- `error_codes`: "{CATEGORY}_{FEATURE}_{ERROR}" _(≥ 3 ALL_CAPS segments)_
- `data_testid`: <feature>-<element>-<type> _(≥ 3 kebab-case segments)_
- `see_also`: AGENT_AFFORDANCES.md (data-agent-action verb catalog)

## verification

see LOCK_FILES.md

Last updated: 2026-07-12T00:00:00Z
```

## ═══ CODE_DOCUMENTATION.md ═══

```markdown
# CODE_DOCUMENTATION

> Rationale for every rule: CODE_DOCUMENTATION.rationale.md. ---------- documentation in code ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## docs

- `jsdoc_required_on`: [exported function, exported class, exported type, exported interface]
- `jsdoc_keys`: ["@description", "@param", "@returns", "@throws", "@example where helpful"]
- `jsdoc_length`: light (1-3 lines); detail lives in the spec
- `jsdoc_audience`:
  PARENT-FACING ONLY — what the symbol does, what to pass, what comes back.
  NOT for: history / "what changed" (→ Changelog story for UI; git for the rest);
  design rationale (→ spec.md); internal mechanics the caller never sees.
  UI prop interfaces: one-line description + @default + optional @example,
  nothing more (see COMPONENT_DOCS.md).
- `banned`:
  - commented-out code (git tracks history)
  - inline comments explaining WHAT (well-named identifiers do that)
  - history / changelog narration in JSDoc or comments (UI history → Changelog story; rest → git)
- `inline_comments`: default ZERO; only a WHY the code cannot express — hidden constraint, subtle invariant, workaround for a specific bug, non-obvious ordering requirement
- `spec_reference_format`: "// see <folder>/__specs__/flows/<fn>.flow.md"

## verification

see LOCK_FILES.md

Last updated: 2026-07-12T00:00:00Z
```

## ═══ LOGGING.md ═══

```markdown
# LOGGING

> Rationale for every rule: LOGGING.rationale.md. ---------- logging ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## logging

- `logger_module`: "@/lib/logger" _(central wrapper)_
- `banned`: console.* in production code paths
- `levels`:
  - `info`: significant business events (resource created, role assigned, multi-step flow completed)
  - `debug`: step-by-step (function entry/exit, repo query starting) — off by default
  - `warn`: recoverable issues (rate-limit hit, retry exhausted, deprecated path)
  - `error`: caught exceptions (pass `err` field for serializer)
  - `trace`: verbose low-level (raw SQL params, request bodies) — off by default
- `redaction`:
  - `rule`: logger config redacts sensitive values BEFORE persisting → "[REDACTED]"
  - `fields_redacted`: [passwords, password hashes, tokens, JWTs, session ids, API keys]
  - `test_required`: redaction config has a test so it can't drift
- `separation`:
  - `logger`: ops diagnostics
  - `audit_log`: compliance / business events _(per-feature audit/ folder shape: SOURCE_FOLDERS#per-feature-structure)_
  - `rule`: never pollute audit from logging code; one event may produce both, but the call sites are separate

## verification

see LOCK_FILES.md

Last updated: 2026-07-12T00:00:00Z
```

## ═══ DESIGN_TOKENS.md ═══

```markdown
# DESIGN_TOKENS

> Rationale for every rule: DESIGN_TOKENS.rationale.md. Single owner of design-token discipline — UI/component standards CITE this file, never restate it. ---------- Tailwind ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## tailwind

- `version`: v4
- `postcss`: "@tailwindcss/postcss"
- `banned`: hardcoded color-shade classes (text-red-500, bg-zinc-400, etc.)
- `required`: semantic tokens defined in globals.css OR opacity-modified named colors (text-white/60)

## verification

see LOCK_FILES.md

Last updated: 2026-07-12T00:00:00Z
```

## ═══ UTC_TIMESTAMPS.md ═══

```markdown
# UTC_TIMESTAMPS

> Rationale for every rule: UTC_TIMESTAMPS.rationale.md. ---------- timestamps — UTC only, every layer ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## timestamps

- `db_column_type`: timestamp with time zone
- `db_connection`: TimeZone=UTC
- `app_code`: ".toISOString() | .getTime()"
- `banned`: ".toLocaleString() — anywhere non-UI"
- `ui_display`: 'Intl.DateTimeFormat(locale, { timeZone: "UTC" })'

## verification

see LOCK_FILES.md

Last updated: 2026-07-12T00:00:00Z
```

## ═══ SOURCE_FOLDERS.md ═══

```markdown
# SOURCE_FOLDERS

> Rationale for every rule: SOURCE_FOLDERS.rationale.md. ---------- top-level src/ structure (Next.js layout) ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## top_level_src

- `app/`: Next.js routes ONLY (no logic)
- `components/`:
  - `shadcn/`: shadcn-generated UI primitives
  - `ui/`: project UI components features/<name>/: feature folders (see per_feature_structure)
- `features/shared/`: cross-feature shared schemas / types
- `views/`: composed views (multiple features per view)
- `services/`: cross-feature service utilities (rare)
- `db/`: top-level DB client + RLS context helpers
- `lib/`: framework-agnostic libs
- `hooks/`: cross-feature React hooks
- `types/`: cross-feature TypeScript types
- `constants/`: cross-feature constants
- `config/`: env config readers
- `utilities/`: pure utility functions
- `security/`: cross-feature security helpers

## per_feature_structure

- `rule`: a feature uses ONLY the sub-folders it actually needs; README-only "padding" folders are BANNED; each sub-folder PRESENT must contain ≥ 1 .ts/.tsx file with real code; the list below is the allowed vocabulary. A feature is SELF-CONTAINED — its UI, business logic, DB schema, contract surface, audit events, and tests all live inside this folder.
- `enforcement`: scripts/verify/verify-specs.mjs --check no-padding-folders refuses any sub-folder under src/features/<name>/ with zero .ts/.tsx files (except __specs__/, which holds YAML)
- `sub_folders`:
  - `components/`: per-feature React components + their __tests__/ and __specs__/
  - `services/`: canonical business logic (service classes/functions) + __tests__/ and __specs__/ (see HEXAGONAL_ARCHITECTURE#architecture)
  - `handlers/`: presentation-agnostic entry points (.handler.ts) returning iApiResult<T>; called by actions/, api routes, and any future transport (mobile, CLI)
  - `mappers/`: DB-row ↔ domain-entity converters + 3rd-party-shape ↔ domain converters
  - `db/`: Drizzle schema (.schema.ts) + repositories (.repository.ts) + permissions.ts (per-feature slug catalog, TS const array — see AUTHORIZATION_STANDARDS.permission_slug_catalog) + __tests__/ and __specs__/
  - `actions/`: Next.js Server Actions (.action.ts) — thin adapters delegating to handlers/; client UI calls these
  - `api-contract/`: OpenAPI registration files (.openapi.ts) — one per HTTP endpoint; each calls registerOpenAPI(...) as a side-effect import; aggregated via per-feature openapi-registrations.ts barrel; consumed at build time to auto-generate /agents.json (see AGENT_AFFORDANCES)
  - `validation/`: Zod schemas (FE/BE contract surface)
  - `types/`: domain types (FE/BE contract surface) — domain.ts
  - `audit/`: per-feature audit-event keys + payload types — events emitted to the audit log; separate from logger ops events (see LOGGING#logging)
  - `mocks/`: per-feature MSW handlers + seed.ts fixtures
  - `__tests__/`: FEATURE-LEVEL integration tests only (cross-file); per-file tests live next to the file

## verification

see LOCK_FILES.md

Last updated: 2026-07-12T00:00:00Z
```

## ═══ HEXAGONAL_ARCHITECTURE.md ═══

```markdown
# HEXAGONAL_ARCHITECTURE

> Rationale for every rule: HEXAGONAL_ARCHITECTURE.rationale.md. ---------- architecture — services are canonical ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## architecture

- `call_graph`:
  [Server Action]  ──┐
  [API Route]   ─────┴─→ [Service] → [Repository] → [DB]
  [AI chat tool] ────┘            │
                                  └─→ [Mapper] → UI/domain shape
- `layers`:
  - `service`: canonical business logic
  - `server_action`: thin adapter — delegates to a service ('use server')
  - `api_route`: thin adapter — delegates to a service (src/app/api/.../route.ts)
  - `repository`: typed methods only (findOne, findMany, findById, create, update, delete); NO generic `execute(op, payload)`
  - `mapper`: DB shape ↔ UI/domain shape; 3rd-party ↔ domain
- `hexagonal`:
  - `rule`: services depend on injected INTERFACES, not concrete implementations
  - `every_external_dep_injected`: [DB, cache, clock, logger, event publisher, hasher, etc.]
  - `return_type`: services return plain domain types (NEVER framework shapes like Response / JSX / form state)
  - `composition_root`: one composition-root.ts per feature; wires concrete adapters into services
  - `no_di_container`: true
  - `no_decorators`: true
  - `test_root`: tests build their own composition root with fake/in-memory adapters
- `cross_feature_communication`:
  - `fire_and_forget`: events via outbox (write event in SAME transaction as data change; worker drains outbox)
  - `request_response`: injected interface owned by the consuming feature; implemented by providing feature's adapter
  - `banned`: events for request-response interactions

## verification

see LOCK_FILES.md

Last updated: 2026-07-12T00:00:00Z
```

## ═══ UNIT_COVERAGE.md ═══

```markdown
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
- `gate`: scripts/verify/verify-tests.mjs --check coverage-threshold _(asserts the vitest config actually sets 100 perFile (catches absent/lowered/non-perFile thresholds))_
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
  - every declared error path (from flow.md.throws)
  - every distinct edge case (from flow.md.paths.edge_*)

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
```

## ═══ TEST_STACK.md ═══

```markdown
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
```

## ═══ MOCKING_DOCTRINE.md ═══

```markdown
# MOCKING_DOCTRINE

> Rationale for every rule: MOCKING_DOCTRINE.rationale.md. Tool choices (MSW, pglite, Vitest): TEST_STACK.md. Coverage bar the refactor protects: UNIT_COVERAGE#coverage. ---------- mocks: DI for code-i-own, MSW for code-i-don't ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## mocking_doctrine

- `code_i_own`:
  - `pattern`: inject dependencies as interfaces (fetchImpl, clock, rng, hasher)
  - `test`: pass vi.fn() or fake adapter at construction
  - `rule`: PREFERRED over MSW for code I author
- `code_i_don_t_own`:
  - `pattern`: MSW handlers
  - `test`: server.use(http.<method>(path, handler)) per scenario
  - `rule`: PREFERRED when the call goes through globalThis.fetch via a library I can't refactor
- `banned`:
  - vi.mock("module") for module-level mocking (last-resort signal)
  - LOCAL_DEV_FORCE_ALL_MOCKS_ON-style runtime toggle infrastructure (UI-app concept; not part of API-first standard)

## refactor_to_testability

- `rule`: untestable function = hidden coupling; refactor by injecting the dependency as an interface
- `hidden_dependencies_to_inject`:
  - Date.now() / new Date() → inject clock
  - fetch() → inject fetcher
  - Math.random() → inject rng
  - process.env.X → inject env reader (or pass the value)
  - fs.readFileSync() → inject fs port
- `banned`:
  - lowering the coverage threshold
  - '"/* istanbul ignore */" annotations'
  - adding files to coverage exclusion lists

Last updated: 2026-07-12T00:00:00Z
```

## ═══ SCENARIO_ENUMERATION.md ═══

```markdown
# SCENARIO_ENUMERATION

> Rationale for every rule: SCENARIO_ENUMERATION.rationale.md. Per-export minimum (happy + declared errors + declared edges): UNIT_COVERAGE#every-export-tested. ---------- independent scenario enumeration ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## scenario_enumeration

- `rule`: walk the CODE PATH; don't transcribe the request
- `per_operation_categories`:
  - happy path
  - input validation failure
  - DB constraint violation (uniqueness / FK / check / NOT NULL / partial-index)
  - connection failure (pool exhausted / network drop / statement timeout)
  - operation cancellation (request aborted / container SIGTERM mid-flight)
  - concurrent caller (two requests at the same instant)
  - TOCTOU race (read-then-write)
  - partial-state on multi-write (write A succeeds, write B fails)
  - authorization boundary (was the caller permitted?)
  - idempotency (same call arrives twice)
  - time-based (token expiry, rate-limit window edges, DST, leap-second)
- `on_unhandled_scenario`: STOP and surface (see PROCESS_DISCIPLINE.md); never silently leave ❌

Last updated: 2026-07-12T00:00:00Z
```

## ═══ NO_THEATER_TESTS.md ═══

```markdown
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
```

## ═══ STATE_VOCABULARY.md ═══

```markdown
# STATE_VOCABULARY

> Single owner of the shared interaction-state vocabulary; creation-tier standards cite this file. ---------- shared state utility classes ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## state_vocabulary

- `rule`:
  every interactive state binds to a shared state utility class. Components NEVER write
  direct hover:/focus:/focus-visible:/active:/disabled: Tailwind utilities in their source.
- `shared_class_naming`:
  - `pattern`: state-<state>-<variant_or_inherit>
  - `canonical_classes`:
    - state-hover-contained _(darkens via filter (consistent across primary/error/inherit))_
    - state-hover-outlined _(subtle bg tint)_
    - state-hover-text _(subtle bg tint)_
    - state-focus-visible _(3px outline + offset; same for ALL variants)_
    - state-active-contained _(darker on press)_
    - state-active-outlined
    - state-active-text
    - state-disabled _(opacity 0.5 + pointer-events:none)_
    - state-loading _(disabled treatment + spinner slot)_
    - state-pressed _(aria-pressed=true visual treatment)_
- `source`: project/src/styles/states.css (or equivalent); template ~/.claude/standards/templates/component-states.css.template
- `verifier`: verify-component-state-vocab.mjs

## banned_direct_state_variants

- `rule`: "direct Tailwind state variants inside src/components/ui/**/*.tsx are FORBIDDEN: 'hover:', 'focus:', 'focus-visible:', 'active:', 'disabled:', 'group-hover:', 'peer-focus:', 'aria-busy:'"
- `exemptions`:
  - `src/styles/**`: token + state-utility source files; exempt
  - `src/components/shadcn/**`: regenerated by shadcn CLI; exempt (never hand-edit — COMPONENT_FOLDERS#component-locations)
- `verifier`: verify-component-tokens.mjs (token-side companion rules owned by DESIGN_TOKENS.md)

## cross_variant_consistency

- `rule`:
  within a cva config, all entries inside the same `variant` group MUST consume the same
  state-class prefix. Example: variants.variant.{default, secondary, destructive} must all
  pair with `state-hover-contained` (not one with brightness-95 and another with opacity-90).
  Per-variant invention is forbidden.
- `detection_strategy`:
  - grep cva config files for `variant` blocks
  - extract per-variant class strings
  - extract substrings matching state-utility patterns (state-hover-*, state-focus-*, etc.)
  - refuse if entries within the same variant group disagree on any state prefix
- `verifier`: verify-component-state-vocab.mjs.cross_variant_consistency_check

## hover_state_vocabulary

- `rule`:
  The state-hover-text* classes ADD `text-decoration: underline` per WCAG 1.4.11 (link-text
  affordance) — ONLY for inline-text-link-style elements. Button-shaped or icon-shaped
  triggers MUST NOT underline on hover. Use the right class for the shape:
- `map`:
  - `"state-hover-text"`:
    - `shape`: "inline text link styled as anchor"
    - `affordance`: "underline on hover (WCAG 1.4.11)"
    - `examples`: ["<Button variant=\"text\"> styled as link"]
  - `"state-hover-text-primary"`:
    - `shape`: "inline text link in primary color"
    - `affordance`: "underline on hover"
    - `examples`: ["<Button variant=\"text\" color=\"primary\">"]
  - `"state-hover-text-error"`:
    - `shape`: "inline text link in error color"
    - `affordance`: "underline on hover"
    - `examples`: ["<Button variant=\"text\" color=\"error\">"]
  - `"state-hover-text-icon"`:
    - `shape`: "icon-only button (no text glyph to underline)"
    - `affordance`: "subtle color/brightness shift on hover; no underline"
    - `examples`: ["DialogClose × icon, DrawerClose × icon, icon-only Button"]
  - `"state-hover-contained"`:
    - `shape`: "filled button — already carries a saturated bg color"
    - `affordance`: "background brightness filter on hover (filter:brightness(0.95))"
    - `examples`: ["<Button variant=\"contained\" color=\"primary\"> (amber bg)"]
    - `WARNING`: "INVISIBLE on transparent backgrounds — filter has nothing to filter. Do NOT use on transparent-bg button-shape triggers."
  - `"state-hover-outlined"`:
    - `shape`: "outlined button — transparent bg with visible border"
    - `affordance`: "muted bg tint on hover"
    - `examples`: ["<Button variant=\"outlined\">"]
  - `"state-hover-soft"`:
    - `shape`: "transparent-bg button-shape trigger WITHOUT a border (ghost button)"
    - `affordance`: "muted bg tint on hover — like outlined, but the trigger lacks a border so this is the ONLY hover affordance"
    - `why_distinct_from_contained`: "state-hover-contained uses filter:brightness, invisible on transparent bg. Borderless ghost buttons NEED an explicit bg-tint or they appear non-interactive."
    - `examples`: ["Tabs trigger (inactive)", "Accordion trigger", "Toggle (default variant)", "ToggleGroup item (default variant)"]
- `forbidden`:
  - "state-hover-text on Tabs/Accordion/Toggle/ToggleGroup/Dialog-close/Drawer-close → those are button-shaped or icon-shaped, NOT inline text links"
  - "state-hover-contained on TRANSPARENT-BG button-shape triggers (Toggle/Tabs/Accordion default variant) → filter:brightness is invisible there. Use state-hover-soft instead."
- `enforcement`:
  `verify-component-state-vocab` checks state-* binding consistency within a primitive (no
  per-variant invention); it does NOT semantically verify shape — that is caller judgment /
  code review. Heuristic: a trigger bigger than a single line of text is NOT inline — use
  -contained / -outlined / -text-icon.

Last updated: 2026-07-12T00:00:00Z
```

## ═══ WRITING_ORDER.md ═══

```markdown
# WRITING_ORDER

> agent needs to APPLY and ENFORCE: the three-phase writing order (spec → code → verify), the drive-to-green loop,
editing a locked feature, the coverage bar, scope authority, and standards-change authority. The lock file the verify
phase stamps: LOCK_FILES.md. ---------- product-level journey phase (precedes every feature) ---------- The circular
journey↔flow loop (USER_JOURNEYS.md) runs at PRODUCT level BEFORE any per-feature writing order below. Journeys + the
flows that satisfy them exist as a reconciled map before a line of code is written.

```meta
version: 1
last_updated: 2026-07-19T16:43:58Z
```

## journey_phase

- `owner`: pm _(orchestrates the loop; dispatches journey-cartographer-core for blind discover)_
- `precedes`: writing_order _(no feature spec_phase starts before journeys are reconciled to flows)_
- `loop`: USER_JOURNEYS#journey-loop _(discover (blind) → match → reconcile → update)_
- `output`: docs/journeys/{J-<NNN>-<slug>.md, 00-INDEX.md}
- `gate_before_features`: docs/journeys/00-INDEX.md shows every journey step mapped to a flow AND no orphan flow (USER_JOURNEYS#reconciliation verdict = YES); feeds the user-locked requirements (REQUIREMENTS_CONTRACT.md) that the writing_order below derives from

## writing_order

- `spec_phase`:
  - `owner`: feature-spec-writer
  - `output`: __specs__/{spec.md, spec.md, flows/, manual/ for EVERY HTTP|UI surface (mandatory; never omitted), ui/ if UI surface, openapi.yaml if HTTP, asyncapi.yaml if events}
  - `hands_off_to`: coder
  - `steps`: 1: write __specs__/spec.md AND __specs__/spec.md 2: write __specs__/flows/<fn>.flow.md for every
    exported function 3: write __specs__/openapi.yaml if invocation.type=http 4: write __specs__/asyncapi.yaml if
    folder emits/subscribes events 5: 'write __specs__/manual/<flow>.md for EVERY HTTP / CLI / UI surface — MANDATORY,
    never skipped. A RUNNABLE adversarial flow (copy-paste into the Claude Code Chrome extension; drives the surface,
    POSTs results to /api/v1/manual-results/<flow>, prints them), NOT a copy of flows/ or the tests. Markdown only;
    five sections (Target/Preconditions/Steps/Assertions/Report); >= 1 "MUST NOT" assertion. NO automated-complete
    escape hatch, NO .yaml form — "tests already cover it" is non-compliant; an absent flow for a callable surface is
    non-compliant. See MANUAL_FLOWS#manual-md + MANUAL_FLOWS#manual-flow-surfaces.' 6: 'write __specs__/ui/<flow>.md
    if invocation.type in (ui, server-action) AND spec.md.ui_design != not-applicable; route to user for sign-off;
    user inserts `<!-- ui-locked: YYYY-MM-DD -->` marker in each file after approving (spec-writer NEVER self-signs)'
    7: drop __specs__/ui/<flow>.design-<state>.png for every state declared in <flow>.md (one PNG per state); user
    exports from any design tool and commits; filename convention is the contract
  - `blocks_coder_phase_until`:
    Path 1: every required __specs__/ui/<flow>.md carries `<!-- ui-locked: YYYY-MM-DD -->` (enforced by verify-ui-design-locked.mjs). Coder phase cannot start without this.
    Path 2 is checked at verify-phase: every required __specs__/ui/<flow>.design-<state>.png scores ≥ ui_screenshot_match_threshold against the Puppeteer screenshot of the matching state (enforced by verify-component --check ui-screenshots-match-designs.mjs). Verifier Mode A cannot stamp the lock without this.
    Features with spec.md.ui_design: not-applicable skip BOTH paths; a one-line reason in spec.md is required.
- `code_phase`:
  - `owner`: coder
  - `output`: source + __tests__/ (red/green TDD with targeted runs allowed)
  - `dialogue_required_with`: feature-spec-writer (when spec is unclear / contradictory / suboptimal)
  - `hands_off_to`: verifier
  - `steps`: 1: write the code (driven by the specs) 2: add JSDoc on every exported function (1-3 lines; detail lives in spec) 3: write __tests__/<code>.test.ts — 100% coverage required (perFile) 4: run targeted `pnpm vitest run <slice-path>` for red/green TDD; NEVER run full verify chain
- `verify_phase`:
  - `owner`: verifier
  - `mode`: A _(semantics: LOCK_FILES#verifier-modes)_
  - `output`: __specs__/standards-compliance.md stamped on green (status:locked, verified:100%, last_validated:<utc-now>) per LOCK_FILES#schema
  - `on_green`: orchestrator may tag compliant/<sha> (see LOCK_FILES#compliant-tag)
  - `on_fail`: drive-to-green loop (see verify_phase_drive_to_green)

- `verify_phase_drive_to_green`:
  - `owner`: orchestrator (Claude Code session OR pm agent OR verifier-core dispatcher)
  - `max_attempts`: 5
  - `behavior`:
    - `on_fail_attempt_lt_max`:
      1. capture verifier's reproduction block verbatim
      2. capture attempt counter (N of MAX)
      3. re-dispatch coder with reproduction + counter
      4. coder iterates source/tests to address EVERY failure in the reproduction
      5. re-dispatch verifier Mode A
      6. increment attempt counter; reset on green
    - `on_fail_attempt_eq_max`:
      SURFACE to user — do not iterate further. Surface contents:
      - all 5 attempts' verifier reproduction blocks (verbatim)
      - all 5 attempts' coder change-summary (file paths + 1-line per change)
      - the unchanging root cause (best-guess from the orchestrator)
      - ask: "spec gap? environmental issue? human design call needed?"
    - `on_green`: stamp + proceed per writing_order.verify_phase
  - `counters`: per-slice (per branch + per feature-path); reset on green; reset on user-triggered "start over"
  - `forbidden`:
    - skipping any verifier output between attempts (never paraphrase the reproduction to the coder)
    - swallowing FAIL silently (the user MUST see attempt 5 surface)
    - bumping max_attempts past 5 without user authorization

## editing_locked

- `shape`: same three phases as writing_order (spec_phase → code_phase → verify_phase)
- `spec_phase_start`: set standards-compliance.md status=unlocked
- `steps`: 1: set status=unlocked 2: feature-spec-writer updates __specs__/spec.md + __specs__/spec.md + flows/ +
  manual/ 3: coder updates source + __tests__/ (100% maintained) 4: verifier Mode A re-runs targeted gates on the
  slice + blast radius 5: verifier re-stamps standards-compliance.md (status=locked, last_validated=<now-utc>) on
  green 6: orchestrator commits; emits new compliant/<sha> tag on green Mode D (see LOCK_FILES#compliant-tag)

## forbidden

- editing code before updating the spec
- coder silently deviating from the spec
- coder running pnpm verify / typecheck / lint / coverage as a release gate
- skipping verifier Mode A on a slice
- bumping last_validated without a real walk

## test_coverage

- `threshold`: 100% _(lines / branches / functions / statements)_
- `cant_reach_100_percent`: split the file or refactor for testability
- `skip_exception`: physically or mathematically impossible only
- `banned_excuses`:
  - too long
  - too many tests required
  - improbable

## spec_yaml_scope_authority

- `rule`: optional spec.md field; one of {user, claude}; default "user"
- `when_claude`:
  - `coder_may_decide_without_asking`:
    - helper extraction (private functions inside the feature folder)
    - internal field/column naming within the operation's domain
    - test fixture choice (placeholder names from CLAUDE.md "Placeholder names" convention)
    - log-key naming
    - private type-alias naming
  - `coder_must_still_surface`:
    - invocation.type changes
    - public API shapes (request_schema / response_schema)
    - permission slugs
    - data destruction (DROP/DELETE/TRUNCATE)
    - third-party API choice
    - library / framework choice
    - any spec edit that alters behavior visible to a caller
- `default_user_behavior`: surface every in-scope decision per CLAUDE.md "Do exactly what is asked"
- `enforced_by`: coder agent reads the field at code-phase start; enum validation lives inline in the coder + spec-writer SOPs

## standards_change_authority

- `rule`: standards changes (any edit to ~/.claude/CLAUDE.md or ~/.claude/standards/*) always surface to the user for explicit approval; the agent never auto-patches standards mid-slice — not even for one-paragraph doc clarifications
- `applies_to`: ~/.claude/CLAUDE.md + ~/.claude/standards/*.{yaml,md,detail.md} + vendored copies
- `procedure`: 1: surface the proposed change verbatim in the end-of-turn report 2: user explicitly approves before the edit lands 3: standards changes ship in their own focused PR, never bundled into a feature slice

Last updated: 2026-07-19T16:43:58Z
```

## ═══ DECISION_LOG.md ═══

```markdown
# DECISION_LOG

> Decisions the user has ruled on are LOGGED and never re-asked.

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## locations

- `global`: ~/.claude/decisions/DECISIONS.yaml _(rulings that apply across all projects)_
- `per_repo`: <repo>/docs/decisions/DECISIONS.yaml _(rulings scoped to one project)_

## entry_schema

- `date`: iso8601_date _(when the ruling was made)_
- `scope`: enum[global, repo]
- `decision`: one-sentence statement of the ruling, in the user's terms
- `context`: one line — what prompted the question
- `source`: enum[user] _(only the user creates decisions)_

## rules

- `append_same_turn`: every user ruling (an AskUserQuestion answer, an explicit "do X not Y", a preference, a scope call) is appended to the correct log IN THE SAME TURN it is given
- `consult_before_asking`: before asking the user ANY question, grep both logs; a question already answered there is NEVER asked again — cite the entry and proceed
- `log_beats_memory`: the log is the source of truth for past rulings; session memory and recollection never override it
- `never_edit_rulings`: entries are append-only; a ruling changes only when the user gives a new ruling (append the new entry; the newest entry for a topic wins)
- `no_silent_downscoping`: a directive is executed WHOLE — never silently reduced to the least-destructive subset; if a step looks destructive or wrong, SAY SO and ask (after consulting the log), never quietly skip it

## enforcement

- `pre_ask_hook`: ~/.claude/hooks/decision-log-guard.mjs _(PreToolUse on AskUserQuestion — injects both logs + the never-re-ask directive into context before any question reaches the user)_
- `tier_1`: CLAUDE.md + STANDARDS_ENTRY.md carry the consult-before-asking + append-same-turn rules

Last updated: 2026-07-12T00:00:00Z
```

## ═══ BROWSER_VALIDATION.md ═══

```markdown
# BROWSER_VALIDATION

> Wherever UI is available and touched, the UI is validated IN A REAL BROWSER (Claude Code Chrome extension) before the slice is done. Tests alone never substitute for driving the rendered surface.

```meta
version: 1
last_updated: 2026-07-16T00:00:00Z
```

## trigger

- `rule`: a slice TOUCHES UI when it creates or edits any component/composite/page source, story, or UI-bearing feature file (.tsx render surface, __stories__/, app routes)
- `consequence`: the slice is NOT done — and Mode A cannot stamp its lock — until the browser walk below is green

## what_runs

_content owners cited; this standard binds them_

- `manual_flows`: every __specs__/manual/<flow>.md for the touched surface is executed in Chrome via the extension, spec-derived and code-blind (MANUAL_FLOWS.md)
- `storybook_two_way`: every control + callback of touched components exercised on the Playground story via the extension (STORYBOOK_TESTING.md)
- `verify_manual_story`: the component's Verify-Manual runbook is followed; verdict + findings recorded through the Master page form (VERIFY_MANUAL_STORIES.md)
- `e2e_ui_variants`: touched cross-feature journeys run their ui variant through the real browser (E2E_TESTING.md)
- `interaction_gated_surfaces`: every modal / menu / accordion / drawer the touched surface owns is OPENED and asserted — unopened surfaces are unvalidated surfaces

## dispatch

- `walker`: ~/.claude/agents/ui-walker-core.md _(dispatchable walk; the active session may also walk inline)_

## evidence

- `results_record_required`: for every manual/<flow>.md the feature ships, a record at <repo>/manual-results/<flow>.<iso8601>.json no older than 60 min before browser_validated — checked by verify-standards-compliance alongside the stamp
- `walk_receipt_signed`: each record is a WALKER-SIGNED receipt (scripts/verify/_walker-receipt.mjs) — an HMAC
  signature over {flow, nonce, walkedAt, ok, observed} using a machine-local key (~/.claude/.walker-signing-key,
  git-ignored). Tamper-evident (editing any signed field breaks the signature) + path-bound (produced by the walker
  signing routine). NOT proof a browser rendered — a walker-signed receipt raises the forgery cost; extension-emitted
  receipts are the unbuilt ceiling. The walker signs ok:true ONLY on a genuine green walk (ui-walker-core.md step 6).
- `lock_stamp`: the feature's standards-compliance.md carries browser_validated:<ISO-8601-UTC>, stamped by verifier Mode A ONLY after the walk is green (LOCK_FILES#schema)
- `results_record`: verdicts persist via POST /api/v1/manual-results/<flow> (MANUAL_FLOWS.md per-app surfaces)
- `ci_split`: walk records are LOCAL evidence (git-ignored) — the record check runs on local machines only; CI validates the committed stamps/locks (browser walks cannot run in CI)
- `no_walk_no_stamp`: a UI-bearing feature's lock without browser_validated fails verify-standards-compliance — mechanically, every verify chain run

## not_required_when

- the repo declares ui_discipline:none (.standards/autonomy.yaml)
- the feature ships no UI surface (no .tsx render surface, no stories, no routes)

## enforced_by

scripts/verify/verify-standards-compliance.mjs _(browser_validated stamp + record existence/freshness on UI-bearing features)_

## record_content_gate

scripts/verify/verify-stamps.mjs --check browser-validation-receipt _(record CONTENT — the newest manual-results record must be a real walk (ok:true + findings), not a stub)_

Last updated: 2026-07-16T00:00:00Z
```

## ═══ API_ENVELOPE.md ═══

```markdown
# API_ENVELOPE

> Every API response on every site uses ONE envelope — success and error alike, always with the correct HTTP status. Features change; the pattern never does. Base: JSend (the widely adopted status/data envelope), extended with the house error-code shape. RFC 9457 problem+json is NOT used — it covers only errors and switches media type, breaking envelope uniformity.

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## envelope

- `media_type`: application/json _(every response, including errors)_
- `success`: _(HTTP 2xx)_
  - `shape`: '{ "status": "success", "data": <payload | null> }'
  - `data`: the actual resource/result; null when the operation returns nothing
- `fail`: _(HTTP 4xx — caller problem (validation, auth, not-found, conflict))_
  - `shape`: '{ "status": "fail", "code": "<ERROR_CODE>", "message": "<human line>", "data": <field-errors | null> }'
- `error`: _(HTTP 5xx — server problem)_
  - `shape`: '{ "status": "error", "code": "<ERROR_CODE>", "message": "<human line>" }'
  - `never_leaks`: stack traces, SQL, internal paths — code + generic message only

## rules

- `no_endpoint_exempt`: every route handler returns the envelope — including 401/403/404/500, middleware rejections, and thrown-error catch-alls
- `http_status_always_correct`: the envelope NEVER substitutes for the right HTTP status; status field and HTTP status agree (success<->2xx, fail<->4xx, error<->5xx)
- `code_shape`: fail/error code follows NAMING.md error-code format; codes are stable API contract values documented in the feature's openapi.yaml
- `single_helper`: one shared respond() helper per repo builds the envelope; handlers never hand-assemble it (drift-proof)
- `openapi_documents_envelope`: every operation's responses in openapi.yaml show the envelope for every declared status

Last updated: 2026-07-12T00:00:00Z
```

## ═══ API_FIRST.md ═══

```markdown
# API_FIRST

> The website IS the API; UI is its first client. Every user capability ships as an API before any user-facing UI exists — so any future client (mobile, console, AI agent) drives the identical services.

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## ordering

_per site, strictly in this order_ 1_services_as_apis: every user capability is a service exposed via an HTTP API
(API_SURFACE.md parity; API_ENVELOPE.md response shape; AUTHORIZATION gating) 2_flows_immediately: the moment an API
lands, its flows are written — the most probable scenarios any user will face (FLOW_CONTRACT.md; mermaid diagram each)
3_e2e_every_flow: every flow gets a real E2E test through the actual transport (E2E_TESTING.md api variants) —
validated, gaps closed, tightened 4_mechanical_complete: the site is 100% functional with ZERO UI — everything a user
can do is achievable via APIs alone, proven by the attestation below 5_then_ui: page-tier UI starts ONLY after the
attestation is locked

## exemption

- `design_library`: atomics/composites (the design system) may be built ANY time — same exemption SITE_BLUEPRINT grants; user-facing pages/routes are what wait

## attestation

- `file`: docs/site/MECHANICAL_COMPLETE.yaml
- `shape`:
  - `marker`: "mechanical-complete: <YYYY-MM-DD> by:(user|agent)"
  - `flows`: map of every flow stem (every flows/*.flow.md in the repo) to its e2e contract path (e2e/<scenario>/<flow>/<flow>.yaml) — none omitted
- `gate`: scripts/verify/verify-outside-in.mjs --check api-first — page-tier source is REFUSED until the attestation exists, carries the marker, maps EVERY flow stem, every cited e2e path exists, and every flow has a mermaid diagram

## why_it_binds

any client — a different UI, a native app, an AI — consumes the same endpoints; user management, subscriptions, everything is API-reachable forever

Last updated: 2026-07-12T00:00:00Z
```

## ═══ REQUIREMENTS_CONTRACT.md ═══

```markdown
# REQUIREMENTS_CONTRACT

> Autonomous building happens ONLY against requirements finalized with the user and locked. Sessions help by building exactly what was agreed — never by guessing, never by silently deciding on the user's behalf.

```meta
version: 1
last_updated: 2026-07-19T16:43:58Z
```

## requirements_phase

- `where`: docs/requirements/REQUIREMENTS.md (+ REQUIREMENTS.yaml when machine fields help)
- `how`: produced WITH the user (brainstorm → draft → user edits → final)
- `outside_in_input`: the user-journey catalog (USER_JOURNEYS.md, docs/journeys/) is the outside-in evidence that shapes requirements — journeys are discovered from the SaaS domain + peer apps BEFORE requirements are drafted, so the capabilities below answer real arriving-user intent, not internal guesswork. Journeys FEED requirements; they never replace them (the user still locks).
- `lock`: "<!-- requirements-locked: YYYY-MM-DD by:user -->" _(ONLY the user locks requirements)_
- `contents`: what the app is, every capability (each becomes an API per API_FIRST.md), actors + gating, out-of-scope list, and the acceptance bar

## autonomous_build

- `starts`: only when the lock marker exists
- `derivation_order`: requirements → journeys (USER_JOURNEYS.md) → standards → decision logs → ask _(never invent)_
- `stop_conditions`: _(the ONLY reasons a session stops)_
  - ALL DONE — every gate green, locks stamped, 100%-standards-met push
  - a question ONLY the user can answer (not derivable from requirements/standards/decisions)
  - an assumption the session is about to make that could CONTRADICT locked requirements or standards — surface it BEFORE building on it
- `no_executive_decisions`: scope, tech beyond STACK.md, product behavior, and anything the requirements are silent on that changes what the user gets — user-owned, always

## assumption_ledger

- `file`: docs/requirements/ASSUMPTIONS.yaml _(append-only, like the decision log)_
- `entry`: { date, assumption, derived_from: <requirements/standards/decision citation> }
- `rule`: every assumption made mid-build is WRITTEN with its derivation BEFORE code relies on it; an assumption with no derivable citation is a stop-condition, not an entry
- `why`: bad assumptions surface in days at review of the ledger — not months later in code

## enforced_by

scripts/verify/verify-outside-in.mjs --check requirements _(shipping repo with features but no user-locked requirements = red)_

Last updated: 2026-07-19T16:43:58Z
```

## ═══ CONTEXT_ECONOMY.md ═══

```markdown
# CONTEXT_ECONOMY

> Context is a budget, not a landfill. Standards-following must get CHEAPER over time, never heavier.

```meta
version: 1
last_updated: 2026-07-26T00:00:00Z
```

## session_injection

- `budget`: 6000 _(chars, TOTAL additionalContext from the SessionStart hook)_
- `composition`: contract (fixed) + catalog (names only) + open lessons (open only) + failures (only when failing)
- `rule`: scopes/rules/details are ONE READ away (INDEX.yaml -> <NAME>.yaml) — never injected wholesale
- `enforced_by`: scripts/verify-standards-meta.mjs _(check 11 pipe-runs the hook and fails over budget)_

## agent_economy

- `read_scope`: an agent reads ONLY the standards in its standards_used list (+ INDEX for routing) — never sweeps the tree
- `output_contract`: strict verbatim-lines-only report formats with hard line caps — transcripts, file dumps, and narration never return to the orchestrator
- `model_fit`: haiku for mechanical run-and-quote work; sonnet only where judgment is the job
- `dispatch_rule`: one focused brief in, one capped report out; follow-ups via SendMessage to the same agent instead of re-briefing a new one
- `offload_rule`: token-heavy transient work (multi-file reads, wide searches, gate/test transcripts, open-ended
  investigation) MAY be dispatched to a pinned-cheap agent when the offload genuinely nets a saving — but only after
  the cheaper inline remedies (dispatch_discipline.prefer_inline) are exhausted. Dispatch is not the default reflex;
  it is the move when inline can no longer keep the loop lean.
- `offload_enforced_by`: hooks/context-bloat-guard.mjs _(PostToolUse: nudges when an inline)_
  _read/search/gate burst crosses the char threshold; leads with inline-summarize/trim, offload second;_
  _resets on subagent dispatch. Advisory (never blocks the tool). Disable with CONTEXT_BLOAT_GUARD=off._

## dispatch_discipline

- `default`: inline — Claude Code does the work in-session by reading the relevant <agent>.md as SOP
- `self_adjudicated`: the session decides whether a dispatch clears the bar; it NEVER prompts the user for per-dispatch approval. In autonomous runs the same self-gate applies with no user in the loop.
- `prefer_inline`: _(before dispatching ANY agent, exhaust the cheaper remedies first)_
  - summarize the finding inline and drop the raw output from working context
  - drop stale / no-longer-needed context rather than moving fresh work out
  - narrow the read (fewer files, tighter grep, targeted line ranges) so it never bloats
- `dispatch_only_when`: _(only after prefer_inline is exhausted AND at least one holds)_
  - `net_saving_offload`: the transient work is heavy enough that a subagent absorbing it (returning a capped report) saves more main-loop tokens across the remaining session than the subagent costs
  - `isolation_required`: parallel file mutation that would conflict inline (worktree)
  - `fresh_context_required`: a reproducibility / repo-blind exercise that must NOT see current context
  - `genuinely_bulk`: "more than 5 near-identical targets where clean capped output materially beats inline"
  - `heavy_verifier`: verifier Mode C / D
- `teams_effectively_never`: a multi-agent team (2+ full-context teammates) is the ~7x case — dispatch one ONLY when the task cannot be done any other way, with an explicit one-line justification. A team for speed or tidiness alone is NON-COMPLIANT.
- `justify`: every dispatch states in one line which dispatch_only_when case it clears and why inline is genuinely worse — a discipline the session applies to itself, recorded in its own reasoning, not a user-facing permission request
- `cheapest_model`: pick the cheapest model that fits (haiku for mechanical; sonnet only where judgment is the job) — model_fit still applies on top of the dispatch decision

## ledgers

- `injection`: decisions inject at question-time only (pre-ask hook); lessons inject open-only; terminated entries live on disk, not in context

## handoff_checkpoints

- `law`: a long or context-heavy session must not let its state die in an uncontrolled compaction. It checkpoints to `docs/handoffs/HANDOFF.md` — a small, forward-looking launchpad a FRESH session boots from — instead of carrying (or `--resume`-ing) accumulated bloat. Continuous work is a chain of bounded sessions stitched by handoffs, not one immortal session.
- `when`: on user command; "every so often" during long runs (per milestone / at a context-size nudge); and automatically before a forced stop — the PreCompact boundary (hooks/handoff-precompact.mjs nudges it), budget ceiling, or error spike.
- `pickup`: a new session opening in a repo with a handoff auto-surfaces it at SessionStart (hooks/handoff-pickup.mjs) and resumes from `## START HERE` — after verifying its claims against git; a stale handoff is refreshed, not trusted blindly.
- `boundary`: the handoff holds the forward map only (START HERE / Queue / In flight / Blockers / Done) — NOT history (git owns that) and NOT decisions (DECISIONS.yaml owns those, logged the same turn).
- `procedure`: the write-handoff skill owns HOW (shape, cadence, rules); this section is the law it complies with.

Last updated: 2026-07-26T00:00:00Z
```
