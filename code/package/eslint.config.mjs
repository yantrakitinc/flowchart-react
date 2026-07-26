import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// ────────────────────────────────────────────────────────────────
// PRIMARY-RULE / RULE 0 lint guards (AUTHORIZATION_STANDARDS.yaml).
//
// This package has no database, no HTTP routes, and no `src/features/` /
// `src/db/` tree of its own (it is a pure client-rendering npm library) — so
// every override below is INERT against real source in this repo. The rules
// exist so `verify-authz.mjs`'s `eslint-permission-rules` sub-check (a
// portable, cross-project gate driven by synthetic `--stdin` fixtures at
// paths like `src/features/...` / `src/db/...` / `src/app/...`, none of
// which exist on disk here) can assert the guard shapes fire/allow exactly
// as the standard requires, so a future project generated from this
// template inherits a correct, already-verified config.
//
// Four guards:
//   1. no-restricted-syntax  — bans casting to `AuthorizedPrincipal` anywhere
//      except the mint helper itself (`src/lib/authz/mint/`).
//   2. no-restricted-imports — bans importing the raw `@/db/client/client`
//      handle outside `src/db/`, `**/composition-root.ts`, and tests.
//   2b. no-restricted-imports — bans importing `drizzle-orm` (or any
//      `drizzle-orm/*` subpath) outside the same allow-list.
//   3. @typescript-eslint/ban-ts-comment — fully bans `@ts-expect-error` /
//      `@ts-ignore` / `@ts-nocheck` inside `src/db/` (no description escape
//      hatch there), while the default `allow-with-description` behavior
//      continues to apply everywhere else (tests included).
//   4. no-restricted-imports — bans a DEEP import of another sub-feature's
//      internals (`@/features/<mod>/<sub>/<anything>`) from a DIFFERENT
//      top-level module, while allowing the sub-feature's own barrel
//      (`@/features/<mod>/<sub>`), `composition-root.ts`, and the three
//      documented deep escape hatches (`types/repositories`, `types/domain`,
//      `permissions`). A module's own files may deep-import their own
//      module's internals freely (see the `src/features/identity/**`
//      override).
// ────────────────────────────────────────────────────────────────

const AUTHORIZED_PRINCIPAL_CAST_MESSAGE =
  'Cannot cast to AuthorizedPrincipal — use mintAuthorizedPrincipal() from src/lib/authz/mint.';
const RAW_DB_IMPORT_MESSAGE = "Don't import raw db handles outside src/db/.";
const DRIZZLE_IMPORT_MESSAGE = "Don't import drizzle-orm outside src/db/.";
const CROSS_FEATURE_IMPORT_MESSAGE =
  'Cross-feature deep import of @/features/ — use the sub-feature barrel, composition-root.ts, or one of the documented types/repositories | types/domain | permissions escape hatches instead.';

/** Deep-import-of-another-module ban, parameterized by the module(s) to exempt (this file's own module deep-imports itself freely). */
function crossFeaturePattern(exemptModule) {
  const modulePart = exemptModule ? `(?!${exemptModule}/)[^/]+` : '[^/]+';
  return {
    regex: `^@/features/${modulePart}/[^/]+/(?!types/repositories$|types/domain$|permissions$).+$`,
    message: CROSS_FEATURE_IMPORT_MESSAGE,
  };
}

const RAW_DB_IMPORT_PATH = { name: '@/db/client/client', message: RAW_DB_IMPORT_MESSAGE };
const DRIZZLE_IMPORT_PATTERN = { regex: '^drizzle-orm(?:/.*)?$', message: DRIZZLE_IMPORT_MESSAGE };

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/**', 'storybook-static/**', 'node_modules/**', '*.config.*'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Guard 1 + 2 + 2b + 4 (base): applies repo-wide under src/.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "TSAsExpression[typeAnnotation.typeName.name='AuthorizedPrincipal']",
          message: AUTHORIZED_PRINCIPAL_CAST_MESSAGE,
        },
        {
          selector: "TSTypeAssertion[typeAnnotation.typeName.name='AuthorizedPrincipal']",
          message: AUTHORIZED_PRINCIPAL_CAST_MESSAGE,
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [RAW_DB_IMPORT_PATH],
          patterns: [DRIZZLE_IMPORT_PATTERN, crossFeaturePattern(null)],
        },
      ],
    },
  },

  // Guard 2 + 2b + 3: src/db/ is the one place raw db handles + drizzle-orm
  // are the point, and @ts-* directives are fully banned (no description
  // escape hatch — a suppressed type error in the RLS-gated data layer is
  // never acceptable).
  {
    files: ['src/db/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': true, 'ts-ignore': true, 'ts-nocheck': true, 'ts-check': false },
      ],
    },
  },

  // Guard 1 allow-list: the mint helper itself is the only place allowed to
  // cast to AuthorizedPrincipal.
  {
    files: ['src/lib/authz/mint/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },

  // Guard 4 relaxation: a module's own files may deep-import their own
  // module's internals across sub-features; cross-MODULE deep imports stay
  // banned. (Template covers the `identity` module used by the portable
  // fixture matrix; add one override per real top-level module as this
  // package ever grows a `src/features/` tree of its own.)
  {
    files: ['src/features/identity/**/*.{ts,tsx}', 'src/features/identity/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [RAW_DB_IMPORT_PATH],
          patterns: [DRIZZLE_IMPORT_PATTERN, crossFeaturePattern('identity')],
        },
      ],
    },
  },

  // Guard 2 + 2b allow-list: composition roots wire the raw db/drizzle
  // handles into services — that IS their job.
  {
    files: ['**/composition-root.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },

  // Guard 2 + 2b allow-list: tests exercise the real db/drizzle surface
  // directly.
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
);
