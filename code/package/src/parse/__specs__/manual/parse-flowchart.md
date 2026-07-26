# parse-flowchart

## Target
local — a Node.js script/REPL importing the built library (`import { parseFlowchart, FlowchartParseError } from
'@yantrakit/flowchart-react'`, or from the package's `dist/` build, or via `pnpm exec tsx` against `src/index.ts`
inside this repo). There is NO HTTP endpoint and NO browser page for this feature — `src/parse/` is a pure-TS
text-to-object compiler shipped as an npm library, not a web app. This is the sanctioned adaptation of the
MANUAL_FLOWS browser-agent channel for a pure-computation library surface (see spec.md `cross_cutting.wcag` /
`cross_cutting.mobile`, both declared "n/a — no UI surface in this folder").

## Preconditions
Node.js >= 18. Either:
- inside this repo: `pnpm install` then run each step below via a scratch script executed with
  `pnpm exec tsx <scratch-file>.ts`, or paste the calls into `pnpm exec tsx` interactively; or
- outside this repo: `npm install @yantrakit/flowchart-react` in a scratch project and `import` from it.

No auth, no seed data, no running server, no network access required for any step.

## Steps
If a step fails twice, record the flow FAIL with a note and STOP — do not loop the step.

1. **action:** Call `parseFlowchart('')`.
   **expected:** Throws `FlowchartParseError` with `reason === 'empty diagram'` and `line === 1`.

2. **action:** Call `parseFlowchart('flowchart TD')` (a header line with no statement line following it).
   **expected:** Throws `FlowchartParseError` with `reason === 'empty diagram'`.

3. **action:** Call `parseFlowchart('flowchart TD\nA[' + 'x'.repeat(5000))` — an unterminated `[` shape opener with
   an oversized label designed to probe for pathological slowdown or unbounded buffering.
   **expected:** Throws `FlowchartParseError` with `reason === 'unclosed bracket "["'` in well under a second — no
   hang, regardless of label length.

4. **action:** Call `parseFlowchart('flowchart TD\n' + Array.from({ length: 2000 }, (_, i) => 'N' + i).join(' --> '))`
   — a single chain statement 2000 nodes long, designed to probe for recursion-depth stack overflow.
   **expected:** Returns synchronously with 2000 nodes and 1999 edges; no stack overflow, no timeout (the chain
   parser loops iteratively per node, it does not recurse).

5. **action:** Call `parseFlowchart('flowchart TD\nA[<script>alert(1)</script>] --> B')` — an HTML/script-injection
   -shaped string placed in a node LABEL (not the id).
   **expected:** Parses successfully; `nodes.find(n => n.id === 'A').label` is the string
   `<script>alert(1)</script>` VERBATIM — this folder does no HTML escaping/sanitization of labels; any UI layer
   rendering `label` later is responsible for escaping it (see spec.md "Out of scope").

6. **action:** Call `parseFlowchart('flowchart TD\nA:::Start --> B')` — an unknown class value crafted to look like
   a valid one via a case game (capital `Start` vs. the real type `start`).
   **expected:** Throws `FlowchartParseError` with `reason === "unknown node class 'Start'"` — class matching is
   case-sensitive; capitalized `Start` is rejected even though lowercase `start` is a valid node type.

7. **action:** Call `parseFlowchart('flowchart TD\n%% A --> EVIL\nA --> B %% B --> ALSO-EVIL\nC --> D')` — comments
   crafted to look like they might smuggle a phantom statement across the comment boundary.
   **expected:** The returned graph has exactly 4 nodes (`A`, `B`, `C`, `D`) and exactly 2 edges (`A->B`, `C->D`);
   no node named `EVIL` or `ALSO-EVIL` exists anywhere in the result — everything after `%%` on a line is stripped
   before the chain parser ever runs.

8. **action:** Call `parseFlowchart(undefined as unknown as string)` — simulate a caller that ignores the
   compile-time `text: string` signature (e.g. a dynamically-typed caller, or an LLM-generated call site).
   **expected:** Throws synchronously (a `TypeError` from calling `.split` on `undefined`) — NOT a hang, and NOT a
   silently-returned empty/wrong graph. Confirms there is no silent-success fallback for non-string input.

9. **action:** For every input above that DID parse successfully (steps 4, 5, 7), call
   `parseFlowchart(serializeFlowchart(parseFlowchart(input)))` and structurally compare the result's `nodes` and
   `edges` (ignoring `id`/`name`, which are caller-supplied, not text-derived) against the first parse's `nodes` and
   `edges`.
   **expected:** Structurally identical on both parses for every case — round-trip fidelity holds even under
   adversarial-but-valid input.

## Assertions
MUST hold, every step:
- Every malformed-input call throws `FlowchartParseError` (never a different error type, never a silent wrong
  result) with a `reason` string and a `line` number pointing at the offending line.
- No call hangs, loops, or takes more than ~1 second regardless of input size.
- Labels are stored/returned byte-for-byte as written between the shape delimiters — no escaping, no truncation
  beyond the documented first-closing-delimiter behavior.

MUST NOT happen:
- A malformed input must NEVER return a partial/wrong `iFlowGraph` instead of throwing.
- A comment must NEVER contribute a node or edge to the result.
- Well-formed-but-adversarial input (steps 4, 5, 7) must NEVER lose structure across a serialize+parse round trip.

## Report
This package ships no HTTP server and no `/api/v1/manual-results/<flow>` route — it is a pure npm library, not a
deployed web app, so there is no local-only results endpoint to POST to. Print the full step-by-step verdict to the
console/chat instead: for each of the 9 steps above, state pass/fail + the observed value, then state one overall
`ok: true` (every step passed) or `ok: false` (name the first failing step).
