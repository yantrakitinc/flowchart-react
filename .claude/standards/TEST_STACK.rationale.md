# TEST_STACK — detail

Why each rule in `TEST_STACK.md` exists.

## Intent

Names the one tool per testing job (runner, E2E driver, browser walkthrough, HTTP mocks, in-memory DBs) plus the two cross-cutting fixtures every suite shares: real minted principals and layered seed data. Which tests to write and to what bar is `UNIT_COVERAGE.md`; when to mock with which tool is `MOCKING_DOCTRINE.md`.

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

Why: Layer A is the type-system defense — the test's first line of defense. A test that hand-rolls a fake principal bypasses Layer A in the test — but the production code DOES go through Layer A. The test then doesn't catch the "function signature mismatch" or "missing slug" class of bug.

The fix: use `mintPrincipal` with the appropriate slugs. The test exercises the same code path as production.

## Mock seed data

Two layers of seed:
- **Shared baseline** at `src/features/shared/mocks/seed.ts` — app-wide defaults (default user, default tenant). Every test starts from this.
- **Per-feature** at `src/features/<name>/mocks/seed.ts` — fixtures specific to the feature.

Ephemeral DB per suite means tests don't leak state into each other. A pglite/mongodb-memory-server instance per suite is fresh; truncate-between-tests in a single instance is the fallback when per-suite is too slow.

## Exemption

Paths inside a `.archive/` folder are exempt (see STANDARDS_ENTRY).

Last updated: 2026-07-12T00:00:00Z
