# isEdgeType

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
1. Import `isEdgeType` and `EDGE_TYPES` from `src/ir`. → expected: import succeeds; `EDGE_TYPES` is a 4-element readonly array.
2. Call `isEdgeType('happy')` (a legal member). → expected: returns `true`.
3. ADVERSARIAL — call `isEdgeType('dotted')` (a plausible line-style word that is NOT a member of `EDGE_TYPES`). → expected: returns `false`.
4. ADVERSARIAL — call `isEdgeType('Happy')` (a case-mismatched duplicate of a legal value). → expected: returns `false` — case-sensitive, no normalization.
5. ADVERSARIAL — call `isEdgeType(null)` and `isEdgeType({})` (non-string abuse). → expected: both return `false`, neither throws.
6. Loop `EDGE_TYPES.forEach(isEdgeType)`. → expected: every call returns `true` (exhaustive positive coverage of the closed set).

## Assertions
- MUST hold: every value in `EDGE_TYPES` returns `true`; every non-member string, every
  case-mismatched string, and every non-string input returns `false`.
- MUST NOT happen: the function throws for any input listed above; the function returns anything
  other than a strict `boolean`.

## Report
There is no `/api/v1/manual-results/<flow>` route for this pure-library surface. Print the
PASS/FAIL of every step above (step number, input, observed return value, pass/fail) so the
operator can copy it back.
