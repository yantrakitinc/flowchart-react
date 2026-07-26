# click-node

## Target

local — a local Storybook / demo page mounting `<FlowChart chart={CHART} onNodeClick={...} />` from `@yantrakit/flowchart-react`, where the harness visibly records/logs every `onNodeClick(nodeId, data)` call (e.g. into an on-page log panel) so the agent can read the result without server-side inspection.

## Preconditions

none — no auth, no seed data. The harness must render at least one node that has a non-empty `description` (to exercise the expand-toggle-does-not-bubble step) and must visibly log each `onNodeClick` call's arguments.

## Steps

1. **action**: Load the harness with a chart containing a node with a description, and click that node's `[data-node-id="<id>"]` element (NOT its expand toggle).
   **expected**: the on-page log shows exactly one new `onNodeClick` call with the clicked node's id as the first argument, and a data object as the second argument whose `type`/`label` match the node.

2. **action** (adversarial — no handler bound): Reconfigure the harness to mount `<FlowChart chart={CHART} />` with NO `onNodeClick` prop bound, then click a node.
   **expected**: no console error/exception is thrown; the click is visibly inert (no log entry appears, no navigation occurs).

3. **action**: On the node with a description, click its expand toggle button at `[data-agent-action="toggle-description"]` (NOT the node body).
   **expected**: the node's description text becomes visible (expand), AND no new `onNodeClick` log entry appears — confirms the toggle click does not bubble into a node-click.

4. **action** (adversarial — race, click during load): Reload the harness and, as fast as possible before the diagram finishes laying out, attempt to click where a node is about to appear.
   **expected**: either nothing happens (the click lands on the "Laying out…" placeholder, which has no `data-node-id`) or, if the click lands after layout completed, a normal single `onNodeClick` fires — never a duplicate/garbled log entry, never a console error.

5. **action** (adversarial — rapid double click): Click the SAME node twice in immediate succession.
   **expected**: exactly two `onNodeClick` log entries appear (one per click), both carrying the same node id — never zero, never more than two.

## Assertions

- MUST: clicking a node with `onNodeClick` bound always produces exactly one log entry per click, with the correct node id.
- MUST: clicking the description expand toggle never produces an `onNodeClick` log entry.
- MUST NOT: clicking a node with no `onNodeClick` bound ever throw a console error.
- MUST NOT: a click during the loading/placeholder state ever produce a log entry referencing a node id that doesn't exist yet.

## Report

POST the results (JSON with explicit boolean `ok`) to `POST /api/v1/manual-results/click-node`. Also print the full results as a human-readable fallback. If any step fails twice, record the flow FAIL with a note and STOP — do not loop the step.
