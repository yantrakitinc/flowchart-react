# UNIT_COVERAGE — detail

Why each rule in `UNIT_COVERAGE.md` exists.

## Intent

Governs the close-up tests that live with each feature, run the code directly, and prove each unit behaves to contract — the "white-box" layer. E2E (outside-in, UI + API) is a separate standard (`E2E_TESTING`); test naming + IDs come from `TEST_NAMING`.

Tests are the only mechanical proof that code works. Without rigorous testing standards, the suite drifts into "tests passed once" theater — a green CI badge that hides untested branches, unverified happy paths, and silent regressions.

## Coverage — hard 100% perFile

100% lines / branches / functions / statements, perFile (not aggregate). Why hard 100%:

- 95% with documented gaps becomes 92% with documented gaps becomes 80% with deferred gaps. The bar slips.
- The "untestable" branch is usually the bug-bearing branch. Refactoring to testability (see `MOCKING_DOCTRINE#refactor-to-testability`) fixes both the untestability AND the underlying coupling.
- perFile (not aggregate) means a feature can't average its coverage by piling tests on easy files.

Server actions are code and get full coverage. Can't reach 100% → split the file or refactor for testability; never lower the threshold, never add ignore annotations, never pad the exclusion list. Only four classes are out of the measured set: the tests themselves, stories, `__specs__/`, and config/`.d.ts` files.

The skip exception is narrow: physically or mathematically impossible. "Too long" and "too many tests required" are scope decisions that should result in splitting the file, not lowering the bar.

## Red/green TDD

Failing test first, observe red, write minimum code, observe green. Code-first then test is banned (even if the test passes). Red-first matters because:

- A test written AFTER the code happens to match the code's observed behavior, not the intended behavior. The test passes because it transcribes the code; bugs in the code become "expected" by the test.
- Red-first forces the test to describe the contract, not the implementation. The contract survives refactors; the implementation transcription doesn't.

The refactor-to-testability exception covers slices where an existing untestable function is being made testable: the refactor PR may add the test without prior red because the prior code was untestable. Note in the commit so future-me knows why.

## Every export has a test

Every exported behavior function has ≥ 1 unit test, named for the behavior. The minimum is happy-path; the realistic floor is happy + every declared error + every declared edge.

Test names are human-readable: `it("refuses login when password hash mismatches")` not `it("test 3")`. The suite doubles as living docs of the contract; six months later, "test 3" describes nothing.

Required scenarios per function come from `flow.yaml`:
- happy path
- every declared `throws:` entry → one test triggering it
- every declared `paths.edge_*` entry → one test exercising it

## E2E per user-facing surface

Every user-facing flow has ≥ 1 Playwright E2E. A feature is not done until its E2E (see `E2E_TESTING`) is green, no matter how green the unit tests are. The E2E asserts BOTH:
- The transport (HTTP response shape).
- The state (the persisted DB row exists with the expected values).

200 OK with no DB row is the silent-failure mode. Asserting only the transport misses it.

The dedicated test DB (per-run container or per-suite truncate) is the safety valve. An E2E that mutates the dev DB pollutes the developer's environment.

E2E folder lives at top level (`e2e/`), parallel to `src/`. Separates E2E from unit/integration — different tooling, different fixtures, different reporting.

## On the "done" claim

Saying "done" / "complete" / "finished" requires quoted proof. The proof is the verbatim final-line output of `pnpm verify` (or `pnpm verify:full` for "fully verified" claims).

The durable record of done is the per-feature `__specs__/standards-compliance.yaml` lock file (see LOCK_FILES.md). The script's output is the moment-in-time proof; the lock file is the persistent state.

## Exemption

Paths inside a `.archive/` folder are exempt (see STANDARDS_ENTRY).

Last updated: 2026-07-12T00:00:00Z
