# render-flowchart

## Target

local — http://localhost:6006 (this package's Storybook, the FlowChart demo story per `src/FlowChart.stories.tsx`)

## Preconditions

Storybook is running locally (`pnpm storybook` or equivalent) and the FlowChart story is open. A knob/control
exists for the `chart` text and the `graph` object (if the story does not expose a `graph` knob, skip step 3 and
note it as not-applicable in the report).

## Steps

1. Load the FlowChart story with its default valid `chart` text.
   - selector: `[data-testid="fc-flowchart"]`
   - expected: the container renders; briefly shows `.fc-loading` ("Laying out…"), then the React Flow canvas with nodes/edges.
2. Adversarial — edit the `chart` knob to malformed text (e.g. delete a closing bracket, or type a nonsense line
   with no valid node/edge syntax) and let the story re-render.
   - selector: `[data-testid="fc-parse-error"]`
   - input: intentionally broken chart text
   - expected: `[data-testid="fc-flowchart"]` gains class `fc-flowchart--error`; `[data-testid="fc-parse-error"]` appears with `role="alert"` showing a parser error message; NO React Flow canvas is present alongside it.
3. Adversarial — if the story exposes both `chart` and `graph` knobs, set BOTH to different, distinguishable
   diagrams at once.
   - expected: the rendered nodes match the `chart` text's diagram, NOT the `graph` object's diagram (chart takes precedence). If only one knob exists, record "not-applicable — story exposes only one input".
4. Adversarial — set the `chart` knob to an empty string `""`.
   - expected: either (a) a parse-error box (empty text rejected), or (b) an empty canvas with zero nodes and no
     thrown/uncaught error. Record which of the two was observed — both are acceptable, a crash is not.
5. Adversarial — with a valid chart loaded, resize the browser viewport to a narrow mobile width (< 400px wide).
   - expected: `fc-flowchart` remains usable — no horizontal scroll/clipping breaks the container; canvas + path
     drawer (if shown) reflow without overlapping or disappearing content.
6. Adversarial — open the browser devtools console before repeating steps 1-5.
   - expected: no uncaught exception or unhandled promise rejection appears in the console at any point.

If a step fails twice, record the flow FAIL with a note and STOP — do not loop the step.

## Assertions

- MUST show `[data-testid="fc-parse-error"]` with `role="alert"` whenever `chart`/`graph` input is invalid or absent.
- MUST NOT render a React Flow canvas at the same time as the parse-error box.
- MUST NOT throw an uncaught exception or unhandled promise rejection in the browser console for any step above.
- MUST honor `chart`-over-`graph` precedence when both are supplied.
- MUST NOT break layout/overflow at a narrow (< 400px) viewport width.

## Report

POST the results (one JSON object per step, plus a final `{ "ok": true|false }` verdict for the whole flow) to
`/api/v1/manual-results/render-flowchart`. Also print the full results to the console/chat for the human copy-back
fallback.
