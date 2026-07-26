# render-flowchart

## Target

local — a local Storybook / demo page hosting `<FlowChart>` from `@yantrakit/flowchart-react` (component library; no app route exists — drive whatever local harness mounts the component, e.g. `pnpm storybook` at the package root, or a local demo page that imports and renders `FlowChart`).

## Preconditions

none — `FlowChart` takes no auth, no seed data, and no running peer service. The harness page must expose at least one control that lets the agent swap the `chart` (DSL text) / `graph` (IR object) input, and one that renders `<FlowChart>` with NO `chart`/`graph` prop bound (or an empty string) for the boundary steps below.

## Steps

1. **action**: Load the harness page mounting `<FlowChart chart={CHART} />` with a valid multi-node/multi-edge Mermaid-like chart (start → decision → two branches → end).
   **expected**: the container `[data-agent-action="flowchart"]` is present; within it, one element per node exists at `[data-node-id]`, each carrying `data-agent-action="select-node"`, `data-node-type`, and an `aria-label` reading "<type> node: <label>".

2. **action** (adversarial — malformed input): Switch the harness to feed `chart` a deliberately broken DSL string (e.g. `"no header here --> b"` — no `flowchart TD/LR/...` header line).
   **expected**: no crash, no blank page. `[data-agent-action="parse-error"]` appears with `role="alert"`, containing visible text matching `/parse error/i` and a `line <N>:<N>:` prefixed reason message. No `[data-node-id]` elements are present.

3. **action** (adversarial — boundary, missing required input): Switch the harness to mount `<FlowChart />` with neither `chart` nor `graph` bound.
   **expected**: same `[data-agent-action="parse-error"]`, `role="alert"` box appears (message references the missing `chart`/`graph` prop) — never a silent blank render.

4. **action** (adversarial — boundary, conflicting inputs): Mount `<FlowChart chart={CHART} graph={SOME_OTHER_GRAPH} />` supplying BOTH props at once with visibly different content (e.g. different node labels).
   **expected**: the rendered nodes match the `chart` text's content, not the `graph` object's — `chart` silently wins over `graph` when both are supplied. Confirm by reading the rendered node labels.

5. **action**: On the successfully-rendered chart from step 1, resize/replace the harness's container height (or re-mount with an explicit `height="320px"` prop) and confirm the canvas fills it.
   **expected**: the outer `[data-agent-action="flowchart"]` element's inline style height matches the supplied value exactly (e.g. `"320px"`), never clipped or overflowing off-screen.

6. **action** (adversarial — replay): Re-trigger the same chart re-render twice in rapid succession (e.g. toggle the `direction` prop back and forth twice quickly) before the first layout finishes.
   **expected**: the page never shows two overlapping/duplicated node sets, never throws a console error about updating state on an unmounted component, and settles on the FINAL requested direction's layout only.

## Assertions

- MUST: a malformed or missing `chart`/`graph` input always renders the `role="alert"` error box — never a blank page, never an uncaught exception in the console.
- MUST: every rendered node carries `data-node-id`, `data-node-type`, `data-agent-action="select-node"`, and a non-empty `aria-label`.
- MUST NOT: two conflicting layout requests fired in quick succession ever produce a visibly corrupted/duplicated node layout, or a "setState on unmounted component" console warning.
- MUST NOT: the `graph` prop ever be used when `chart` is also supplied.

## Report

POST the results (one JSON object with an explicit boolean `ok`: `true` if every assertion held and nothing in the MUST-NOT list happened, `false` otherwise, plus notes per step) to `POST /api/v1/manual-results/render-flowchart`. Also print the full results to the console/chat output as a human-readable fallback. If any step fails twice, record the flow FAIL with a note and STOP — do not loop the step.
