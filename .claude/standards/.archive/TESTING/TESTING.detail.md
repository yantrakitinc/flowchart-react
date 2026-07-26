# TESTING — detail

Why each rule in `TESTING.yaml` exists.

## Why this standard exists at all

Tests are the only mechanical proof that code works. Without rigorous testing standards, the suite drifts into "tests passed once" theater — a green CI badge that hides untested branches, unverified happy paths, and silent regressions.

Under STANDARDS_COMPLIANCE, the verify gate is single + minimal; the manual walk does what no script can. TESTING.yaml carries the discipline around HOW to test, not WHEN (when is STANDARDS_COMPLIANCE) and not WHAT TO RUN (that's the script).

## Coverage — hard 100% perFile

100% lines / branches / functions / statements, perFile (not aggregate). Why hard 100%:

- 95% with documented gaps becomes 92% with documented gaps becomes 80% with deferred gaps. The bar slips.
- The "untestable" branch is usually the bug-bearing branch. Refactoring to testability fixes both the untestability AND the underlying coupling.
- perFile (not aggregate) means a feature can't average its coverage by piling tests on easy files.

The skip exception is narrow: physically or mathematically impossible. "Too long" and "too many tests required" are scope decisions that should result in splitting the file, not lowering the bar.

## Red/green TDD

Failing test first, observe red, write minimum code, observe green. Red-first matters because:

- A test written AFTER the code happens to match the code's observed behavior, not the intended behavior. The test passes because it transcribes the code; bugs in the code become "expected" by the test.
- Red-first forces the test to describe the contract, not the implementation. The contract survives refactors; the implementation transcription doesn't.

The refactor-to-testability exception covers slices where an existing untestable function is being made testable: the refactor PR may add the test without prior red because the prior code was untestable. Note in the commit so future-me knows why.

## Test stack

Each tool has a specific job:

- **Vitest** for unit + integration. Native ESM, TS support, faster startup than Jest. Default unit-test runner.
- **Playwright** for scripted E2E. Better cross-browser, native ESM, free parallelization, no third-party paywall pressure.
- **Puppeteer** alongside Playwright. Not instead — Puppeteer is the I-need-to-click-around-a-real-browser horse; Playwright is the scripted-CI horse. AI-agent walkthroughs use Puppeteer's programmable session.
- **Swagger UI** for the manual API explorer. The Chrome-extension agent drives it to exercise every endpoint with pure data.
- **MSW** for 3rd-party HTTP mocks. Intercepts at the fetch/undici layer — application code makes real fetch calls without knowing they're mocked.
- **pglite** for in-memory Postgres. No external DB dependency for unit tests; fresh per suite.
- **mongodb-memory-server** for in-memory Mongo. Same shape for MongoDB-backed projects.

## Permission-aware tests

Every test that touches a service / repository / route mints a real `iAuthorizedPrincipal<TSlug>` via the production `mintPrincipal` producer. NOT a hand-rolled fake, NOT a cast.

Why: Layer A is the type-system defense. A test that hand-rolls a fake principal bypasses Layer A in the test — but the production code DOES go through Layer A. The test then doesn't catch the "function signature mismatch" or "missing slug" class of bug.

The fix: use `mintPrincipal` with the appropriate slugs. The test exercises the same code path as production.

## Mock seed data

Two layers of seed:
- **Shared baseline** at `src/features/shared/mocks/seed.ts` — app-wide defaults (default user, default tenant). Every test starts from this.
- **Per-feature** at `src/features/<name>/mocks/seed.ts` — fixtures specific to the feature.

Ephemeral DB per suite means tests don't leak state into each other. A pglite/mongodb-memory-server instance per suite is fresh; truncate-between-tests in a single instance is the fallback when per-suite is too slow.

## Mocking doctrine — DI for code-I-own, MSW for code-I-don't

The recurring temptation is `vi.mock("../something")` to replace what a function imports. That's last-resort signal — the function has a hidden dependency that should be injected.

The doctrine:
- **Code I author** — dependencies (clock, fetch, rng, hasher) come in as injected interfaces. Tests pass `vi.fn()` or a fake adapter at construction.
- **Code I don't author** (a library that calls `globalThis.fetch` directly, where I can't refactor the call site) — MSW intercepts at the fetch layer.

Banned: `vi.mock("module")` for module-level mocking of code-I-own. If reaching for it, the function under test has a hidden dependency; refactor that into an interface instead.

`LOCAL_DEV_FORCE_ALL_MOCKS_ON`-style runtime-toggle infrastructure is out of scope for API-first standards (DI + MSW + pglite cover the surface). UI apps that grow a dev panel may revisit it on their own terms.

## Every export has a test

Every exported behavior function has ≥ 1 unit test. The minimum is happy-path; the realistic floor is happy + every declared error + every declared edge.

Test names are human-readable: `it("refuses login when password hash mismatches")` not `it("test 3")`. The suite doubles as living docs of the contract; six months later, "test 3" describes nothing.

Required scenarios per function come from `flow.yaml`:
- happy path
- every declared `throws:` entry → one test triggering it
- every declared `paths.edge_*` entry → one test exercising it

## Refactor to testability

A hard-to-test function has a hidden dependency. The dependency is what makes it non-deterministic in production AND untestable. Refactor by injecting the dependency as an interface:

- `Date.now()` → `inject clock: iClock`
- `fetch()` → `inject fetcher: iFetcher`
- `Math.random()` → `inject rng: iRng`
- `process.env.X` → `inject env: iEnvReader` (or pass the value directly)
- `fs.readFileSync()` → `inject fs: iFsPort`

The injected version is testable (pass a fake). The non-injected version is hard-to-test AND non-deterministic in production. The refactor solves both.

Banned:
- Lowering the coverage threshold.
- `/* istanbul ignore */` annotations.
- Adding files to coverage exclusion lists.

Each ban exists because each is the easy path that defeats the goal — the underlying coupling never gets fixed.

## Independent scenario enumeration

Walk the code path, don't transcribe the request. For each operation, enumerate:

- Happy path.
- Input validation failure.
- DB constraint violation — uniqueness, FK, check, NOT NULL, partial-index conflict.
- Connection failure — pool exhausted, network drop, statement timeout.
- Operation cancellation — request aborted, container SIGTERM.
- Concurrent caller — two requests hitting the same resource at the same instant.
- TOCTOU race — `if (count === 0) insert(...)` is non-atomic.
- Partial-state on multi-write — service doing 2+ writes without a transaction.
- Authorization boundary — was the caller permitted?
- Idempotency — same call arrives twice (network retry, double-click, webhook redelivery).
- Time-based — token expiry, rate-limit window edges, DST, leap-second.

Listing only the scenarios the parent mentioned = transcribing, not auditing. If a scenario reveals a defect, STOP and surface (per PROCESS_DISCIPLINE).

## E2E per user-facing surface

Every user-facing flow has ≥ 1 Playwright E2E. The E2E asserts BOTH:
- The transport (HTTP response shape).
- The state (the persisted DB row exists with the expected values).

200 OK with no DB row is the silent-failure mode. Asserting only the transport misses it.

The dedicated test DB (per-run container or per-suite truncate) is the safety valve. An E2E that mutates the dev DB pollutes the developer's environment.

E2E folder lives at top level (`e2e/`), parallel to `src/`. Separates E2E from unit/integration — different tooling, different fixtures, different reporting.

## No orphan markers — bidirectional

Every `data-testid` / `data-agent-action` / `data-agent-step` / `aria-label` on an element must be referenced by ≥ 1 test or `__specs__/manual/<flow>.md`. Every test selector must point at a marker on a real element.

Banned:
- `data-testid` added but never tested — silent dead code in markup.
- Test selector for a marker no element carries — selector returns nothing, assertions on nothing pass vacuously.
- State CSS class with no element carrying it — dead CSS.

No central `docs/test-matrix/marker-audit.md` register. Cross-feature collision checks use grep; the per-feature spec.yaml documents the markers each feature owns.

## Computed-style verification

`classList.contains("active")` proves the class was added. It does NOT prove a CSS rule responded to it. The user-perceivable state change might not have happened.

`getComputedStyle(el).<prop>` reads the actual rendered value. Or screenshot regression compares pixels.

Use computed-style or screenshot for any state change a user is supposed to perceive. Plain `classList.contains` alone is theater.

## No theater tests

Three theater patterns:

1. **Lone `.not.toThrow()`.** `expect(() => fn()).not.toThrow()` proves the function doesn't throw. It doesn't prove the function does anything else. If `fn` is supposed to mutate state, that mutation must be asserted; otherwise the test passes whether or not `fn` works.

2. **Safety-counter loops.** `while (counter-- > 0 && condition) { ... }` exits when the counter hits zero. The test still passes whether the condition was ever met. Replace with proper wait/timeout primitives that fail loudly.

3. **Self-mocked function under test.** `vi.mock("../basename")` where `basename` is the file being tested — the test exercises the mock, not the real code. Don't mock the function under test; inject its dependencies instead.

The test: delete the production code. Does the test still pass? If yes, it's theater.

## Two-gate discipline — `pnpm verify` vs `pnpm verify:full`

Two gates with distinct scopes:

**`pnpm verify`** — the universal gate. Runs everywhere (pre-push hook, CI, ad-hoc local). Components:
- `verify-standards-compliance` — the ONE standards-checking script (presence + freshness).
- typecheck — TypeScript strict.
- lint — ESLint zero-warnings.
- test (with coverage) — Vitest at 100% perFile.
- e2e — Playwright suite.
- boot-smoke — when the project boots a dev server in CI/preview.

**`pnpm verify:full`** — the heavyweight LOCAL ONLY gate. Runs additionally:
- Puppeteer walkthroughs against the local dev server.
- Heavy live-DB integration tests (real Postgres, not pglite).
- Any check that requires the operator to be at the keyboard with the dev server up.

Never runs from CI / GitHub Actions / pre-push. The operator triggers it before claiming "fully verified" — typically before submitting a major PR or before merging a release branch.

The split exists because some checks are too slow / too local-dependent for every-push enforcement. Putting them in CI would make every PR take 20 minutes and would break when CI doesn't have the local dev environment. Putting them in the regular pre-push would burn the developer's cycle time. Splitting them keeps everyday flow fast AND lets the operator opt in to deep verification when it matters.

## On the "done" claim

Saying "done" / "complete" / "finished" requires quoted proof. The proof is the verbatim final-line output of `pnpm verify` (or `pnpm verify:full` for "fully verified" claims).

The durable record of done is the per-feature `__specs__/standards-compliance.yaml` lock file (see STANDARDS_COMPLIANCE.yaml). The script's output is the moment-in-time proof; the lock file is the persistent state.

Last updated: 2026-07-11T00:00:00Z
