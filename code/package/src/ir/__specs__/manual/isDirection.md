# isDirection

> Copy-paste this whole file into the Claude Code Chrome extension / CLI agent. This module ships
> no HTTP/UI surface — there is no `manual-results` POST route — so the agent runs a short
> Node/tsx script instead of driving a browser, and records PASS/FAIL inline (also printing it,
> per the standard report shape).

## Target
local — Node.js runtime, no HTTP/browser surface. Run from the repo root
(`code/package/`) with `pnpm exec tsx <script>.ts`, or open a Vitest scratch file. Import from
`src/ir` (in-repo) or `@yantrakit/flowchart-react` (as a package consumer).

## Preconditions
- Dependencies installed (`pnpm install` from `code/package/`).
- No build step required to exercise `src/ir` directly via `tsx`.

## Steps
1. Import `isDirection` and `DIRECTIONS` from `src/ir`. → expected: import succeeds; `DIRECTIONS` is a 4-element readonly array.
2. Call `isDirection('LR')` (a legal member). → expected: returns `true`.
3. ADVERSARIAL — call `isDirection('TB')` (the REAL Mermaid direction token, which this package deliberately does not alias to `'TD'`). → expected: returns `false`.
4. ADVERSARIAL — call `isDirection('')` (empty-string boundary). → expected: returns `false`.
5. ADVERSARIAL — call `isDirection({ dir: 'TD' })` and `isDirection(undefined)` (non-string abuse). → expected: both return `false`, neither throws.
6. Loop `DIRECTIONS.forEach(isDirection)`. → expected: every call returns `true` (exhaustive positive coverage of the closed set).

## Assertions
- MUST hold: every value in `DIRECTIONS` returns `true`; `'TB'`, the empty string, and every
  non-string input return `false`.
- MUST NOT happen: the function throws for any input listed above; the function silently aliases
  `'TB'` to `'TD'` or performs any other normalization; the function returns anything other than
  a strict `boolean`.

## Report
There is no `/api/v1/manual-results/<flow>` route for this pure-library surface. Print the
PASS/FAIL of every step above (step number, input, observed return value, pass/fail) so the
operator can copy it back.
