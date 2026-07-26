# scripts/verify-eslint-permission-rules — ESLint guard verifier

## Concept

The PRIMARY RULE's compile-time enforcement leans on a small set of
ESLint rules configured in `eslint.config.mjs`. If a future config
refactor silently drops or relaxes any of them, the brand type
`AuthorizedPrincipal<S>` becomes a paper tiger again. This script
catches that drift by feeding known-violating snippets through
`eslint --stdin --stdin-filename` and asserting the expected diagnostic
appears (or, for allow-list fixtures, asserting NO violation appears).

Four guard families are exercised:

- **Rule 1** — `AuthorizedPrincipal<S>` brand cast forbidden outside
  the `mint` helper (covers both `as` and angle-bracket casts).
- **Rule 2** — `getDb` (raw DB handle) import forbidden outside
  `src/db/`, `composition-root.ts`, and tests.
- **Rule 2b** — `drizzle-orm` (and its subpaths) import forbidden
  outside `src/db/`, `composition-root.ts`, tests, and `e2e/fixtures/`.
- **Rule 3** — `@ts-*` directive comments forbidden inside `src/db/`.
- **Rule 4** — Cross-feature deep import (`@/features/<f>/<sub>/...`)
  forbidden from a file outside `src/features/<m>/`. Five entry points
  remain allowed: sub-feature barrel, `types/repositories`,
  `types/domain`, `permissions`, `composition-root`.

`--stdin-filename` provides ESLint with a virtual path that the
flat-config `files:` globs match against, so the relevant overrides fire
even though the file does not exist on disk. `--no-ignore` bypasses
`.gitignore` / `node_modules` filters.

## Files

1. `verify-eslint-permission-rules.mjs` — entry point. Exports the
   fixture matrix (`FIXTURES`), the pure helpers
   (`runEslintOnSnippet`, `checkFixture`, `audit`, `formatReport`),
   the driver layer (`main`, `cliMain`, `isCliInvocation`,
   `maybeRunCli`), and the default IO ports (`defaultRunEslint`,
   `defaultStdoutWrite`, `defaultStderrWrite`).
2. `__tests__/verify-eslint-permission-rules.test.mjs` — Vitest suite.
   Drives every helper via dependency-injected IO (mocked ESLint
   spawn) so the suite reaches 100/100/100/100 per-file coverage
   without invoking the real ESLint binary.
3. `__specs__/spec.yaml`, `__specs__/spec.md`,
   `__specs__/flows/*.flow.yaml`,
   `__specs__/manual/verify-eslint-permission-rules.yaml`,
   `__specs__/standards-compliance.yaml`.

## Out of scope

- Adding new guards. New rules belong in `eslint.config.mjs`; this
  script then gets a new fixture row.
- Running the broader `pnpm lint` step. That covers the WHOLE codebase
  against ALL rules; this script targets the four guard families with
  controlled snippets.

## Output contract

- stdout (success): `verify-eslint-permission-rules: OK (<N> fixture(s) checked)`
- stderr (failure): one summary line plus one error per fixture:
  - `  <fixture-name>: <reason>`
- Exit code: 0 on success, 1 on any fixture failure.
