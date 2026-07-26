# NO_THEATER_TESTS — detail

Why each rule in `NO_THEATER_TESTS.md` exists.

## Intent

Tests must exercise real behavior: if deleting the production code leaves the test passing, it's theater and banned. This standard owns the three theater patterns and the two verification gates that make green mean something.

## No theater tests

Three theater patterns:

1. **Lone `.not.toThrow()`.** `expect(() => fn()).not.toThrow()` proves the function doesn't throw. It doesn't prove the function does anything else. If `fn` is supposed to mutate state, that mutation must be asserted; otherwise the test passes whether or not `fn` works.

2. **Safety-counter loops.** `while (counter-- > 0 && condition) { ... }` exits when the counter hits zero. The test still passes whether the condition was ever met. Replace with proper wait/timeout primitives that fail loudly.

3. **Self-mocked function under test.** `vi.mock("../basename")` where `basename` is the file being tested — the test exercises the mock, not the real code. Don't mock the function under test; inject its dependencies instead (see `MOCKING_DOCTRINE#refactor-to-testability`).

The test: delete the production code. Does the test still pass? If yes, it's theater.

## Two-gate discipline — `pnpm verify` vs `pnpm verify:full`

Two gates with distinct scopes:

**`pnpm verify`** — the universal gate. Runs everywhere (pre-push hook, CI, ad-hoc local). Components:
- `verify-standards-compliance` — the ONE standards-checking script (presence + freshness).
- typecheck — TypeScript strict.
- lint — ESLint zero-warnings.
- test (with coverage) — Vitest at 100% perFile (see `UNIT_COVERAGE#coverage`).
- e2e — Playwright suite.
- boot-smoke — when the project boots a dev server in CI/preview.

**`pnpm verify:full`** — the heavyweight LOCAL ONLY gate. Runs additionally:
- Puppeteer walkthroughs against the local dev server.
- Heavy live-DB integration tests (real Postgres, not pglite).
- Any check that requires the operator to be at the keyboard with the dev server up.

Never runs from CI / GitHub Actions / pre-push. The operator triggers it before claiming "fully verified" — typically before submitting a major PR or before merging a release branch.

The split exists because some checks are too slow / too local-dependent for every-push enforcement. Putting them in CI would make every PR take 20 minutes and would break when CI doesn't have the local dev environment. Putting them in the regular pre-push would burn the developer's cycle time. Splitting them keeps everyday flow fast AND lets the operator opt in to deep verification when it matters.

## Exemption

Paths inside a `.archive/` folder are exempt (see STANDARDS_ENTRY).

Last updated: 2026-07-12T00:00:00Z
