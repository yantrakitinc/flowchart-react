# Unit / in-feature testing standard

Governs the close-up tests that live with each feature, run the code directly, and prove each unit
behaves to contract — the "white-box" layer. E2E (outside-in, UI + API) is a separate standard
(`E2E_TESTING`); test naming + IDs come from `TEST_NAMING`.

## Coverage — literal 100%

Lines, branches, functions, statements = 100%, **per file** (not aggregate). Server actions are
code and get full coverage. Can't reach 100% → split the file or refactor for testability; never
lower the threshold, never add ignore annotations, never pad the exclusion list. Only four classes
are out of the measured set: the tests themselves, stories, `__specs__/`, and config/`.d.ts` files.

## Red/green TDD

Write the failing test first, observe red, write the minimum to pass, observe green. Code-first then
test is banned (even if the test passes). The one exception is adding a test to an existing untestable
function during a refactor-to-testability slice — noted in the commit.

## Every export tested, no theater

Every exported behavior has at least one test, named for the behavior. Walk the code path and cover
the standard scenario categories (happy, validation, constraint, connection, cancellation, concurrency,
TOCTOU, partial-state, authorization, idempotency, time-based). Tests must exercise real behavior:
if deleting the production code leaves the test passing, it's theater and banned.

## Permission-aware

Any test touching a service / repository / route mints a real `iAuthorizedPrincipal<TSlug>` — no
hand-rolled fakes, no `as` casts. Layer A is the test's first line of defense.

## Mocking doctrine

Inject dependencies for code you own (clock, fetcher, rng, env, fs); MSW for code you don't. Avoid
module-level `vi.mock`. Untestable code is hidden coupling — fix it by injecting the dependency, never
by lowering the bar.

## Storybook component testing — two-way coverage

A component that ships stories is verified two ways. Its **Playground** story exposes every prop as a
control in the sidebar, **except function props**, which are wired to the **actions** panel. Then
**every control and every scenario** is checkable both by a **unit test** and by the **Claude Code
Chrome Extension** operating the Playground story. Cases follow `TEST_NAMING`
(`unit:<feature-path>/<Component>/<case>`).

## Computed-style + done

Perceivable state changes are verified via `getComputedStyle` or screenshot regression, not just
`classList.contains`. A feature is not done until its E2E (see `E2E_TESTING`) is green, no matter how
green the unit tests are — and "done" is never claimed without quoted proof (the verbatim final line
of `pnpm verify`).

## Exemption

Paths inside a `.archive/` folder are exempt (see STANDARDS_ENTRY).
Last updated: 2026-07-11T00:00:00Z
