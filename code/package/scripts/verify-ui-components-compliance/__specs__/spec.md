# scripts/verify-ui-components-compliance — G-UI-COMPONENTS gate

## Concept

Mechanical gate for the three UI component shape / placement / styling rules from `.claude/standards/COMPONENT_FOLDERS.yaml` and `.claude/standards/COMPONENT_LIBRARY_DOCTRINE.yaml` (RULE FE-1 / FE-3 / FE-4).

**GATE-1 — Component-folder shape.** Every component under `src/components/ui/<Name>/` or `src/features/<feature>/components/<Name>/` MUST contain:

- `<Name>.tsx` (or `.ts`)
- `index.ts` (mandatory barrel)
- `__tests__/<Name>.test.tsx`
- `__stories__/<Name>.stories.tsx`
- `__specs__/spec.yaml`
- `__specs__/standards-compliance.yaml`

**GATE-2 — Hardcoded Tailwind shade classes.** Any `<utility>-<color>-<shade>` form (`text-red-500`, `bg-zinc-800`, `from-violet-400`, `bg-black`, `text-white`, etc.) in `src/components/ui/`, `src/features/*/components/`, or `src/app/` is a violation. Use semantic tokens from `globals.css` (`text-foreground`, `bg-background`, `bg-primary`, `border-border`, etc.) instead. The shadcn tree (`src/components/shadcn/`) is exempt — the CLI emits shade classes and we never hand-edit there. Translation catalogues (`src/i18n/messages/`) are exempt — they are JSON, not React.

**GATE-3 — Component location.** Every `.tsx` file that exports a React component MUST live in one of:

- `src/components/shadcn/<file>.tsx` (flat — shadcn emits flat)
- `src/components/ui/<Name>/...`
- `src/features/<feature>/components/<Name>/...`
- `src/app/**` (Next.js App Router pages / layouts)

**GATE-4 — shadcn hand-edit heuristic.** SKIPPED — needs an upstream diff which the verify gate can't cheaply do offline. Tracked separately; out of scope for this gate.

The gate is non-overridable per RULE 0. The only way to relax it is to edit `.claude/standards/COMPONENT_FOLDERS.yaml` AND `.claude/standards/COMPONENT_LIBRARY_DOCTRINE.yaml` in a committed PR with explicit human review.

## Files

1. `verify-ui-components-compliance.mjs` — entry point. Exports `collectFiles`, `isShadeExempt`, `findShadeViolations`, `collectComponentFolders`, `auditFolderShape`, `findMisplacedComponents`, `runAudit`, `isCliInvocation`, `maybeRunCli`, `_constants` (`SHADE_RE`, `BLACK_WHITE_RE`, `SHADE_EXEMPT_DIRS`, `STANDARD_DIRS`, `VIOLATION_PREFIX`).

## Dependency injection

`maybeRunCli` accepts `{ importMetaUrl, argv1, exit?, runAudit? }` so the test suite can drive both branches of the CLI guard (`isCliInvocation` true vs false) deterministically without spawning a child process.

Comment handling: `findShadeViolations` strips block comments (`/* ... */`, including multi-line spans across consecutive lines) AND line comments (`//`) BEFORE running the shade regex so JSDoc / inline comments that mention `text-red-500` etc. are documentation, not violations.

## Out of scope

- shadcn upstream-diff comparison (GATE-4 placeholder).
- Auto-fixing violations — the script reports; the coder agent fixes.
- Component-naming linting (e.g., enforcing PascalCase) — that's TypeScript's job via eslint rules.

## Output contract

- stdout (success): `[verify-ui-components-compliance] PASS — <N> component folder(s) checked; no shade classes in non-shadcn code; no misplaced components.`
- stderr (failure): `G-UI-COMPONENTS violation: ...` + per-gate breakdown + rule-reference + non-override notice.
- Exit code: 0 on PASS; 1 on any violation.
