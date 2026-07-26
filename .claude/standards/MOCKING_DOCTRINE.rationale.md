# MOCKING_DOCTRINE — detail

Why each rule in `MOCKING_DOCTRINE.md` exists.

## Intent

Inject dependencies for code you own (clock, fetcher, rng, env, fs); MSW for code you don't. Avoid module-level `vi.mock`. Untestable code is hidden coupling — fix it by injecting the dependency, never by lowering the bar. The tools themselves (MSW, Vitest, pglite) are named in `TEST_STACK.md`; the coverage bar this doctrine protects is `UNIT_COVERAGE#coverage`.

## Mocking doctrine — DI for code-I-own, MSW for code-I-don't

The recurring temptation is `vi.mock("../something")` to replace what a function imports. That's last-resort signal — the function has a hidden dependency that should be injected.

The doctrine:
- **Code I author** — dependencies (clock, fetch, rng, hasher) come in as injected interfaces. Tests pass `vi.fn()` or a fake adapter at construction.
- **Code I don't author** (a library that calls `globalThis.fetch` directly, where I can't refactor the call site) — MSW intercepts at the fetch layer.

Banned: `vi.mock("module")` for module-level mocking of code-I-own. If reaching for it, the function under test has a hidden dependency; refactor that into an interface instead.

`LOCAL_DEV_FORCE_ALL_MOCKS_ON`-style runtime-toggle infrastructure is out of scope for API-first standards (DI + MSW + pglite cover the surface). UI apps that grow a dev panel may revisit it on their own terms.

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

## Exemption

Paths inside a `.archive/` folder are exempt (see STANDARDS_ENTRY).

Last updated: 2026-07-12T00:00:00Z
