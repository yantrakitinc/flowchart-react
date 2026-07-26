# select-path

## Target

local — a local Storybook / demo page mounting `<FlowChart chart={CHART} showPathDrawer />` from `@yantrakit/flowchart-react`, where `CHART` contains at least one decision node producing 2+ distinct start→end paths (e.g. a start → decision → happy branch / error branch → end diagram).

## Preconditions

none — no auth, no seed data. The harness must render the multi-path chart described above so the drawer has 2+ real path rows to click.

## Steps

1. **action**: Load the harness with the multi-path chart.
   **expected**: `[data-agent-action="path-drawer"]` is present (an `<aside aria-label="Path selector">`), containing an "All paths" row at `[data-path-id="all"]` plus one row per detected path at `[data-agent-action="select-path"][data-path-id^="path-"]`. The drawer title text shows the correct count, e.g. "Paths (2)".

2. **action**: Click the first `[data-path-id="path-1"]` row.
   **expected**: that row gains `aria-selected="true"`; every OTHER path row has `aria-selected="false"`; nodes/edges NOT on path-1 visually dim (their DOM classes include a "dimmed" modifier); nodes/edges ON path-1 do not dim.

3. **action** (adversarial — repeat click / toggle): Click the SAME `[data-path-id="path-1"]` row a second time.
   **expected**: the selection clears — `aria-selected="false"` on every row, no node/edge remains dimmed. Clicking a selected row again must deselect it, not re-select it.

4. **action**: Click `[data-path-id="all"]` after selecting any path.
   **expected**: selection clears identically to step 3 (this is the explicit reset control).

5. **action** (adversarial — boundary, no paths): Reconfigure the harness to mount `<FlowChart graph={SINGLE_ISOLATED_NODE_GRAPH} showPathDrawer />` where the graph has zero edges and zero traversable start/end pair such that path detection yields none (or mount against an intentionally empty graph).
   **expected**: `[data-agent-action="path-drawer"]` is ABSENT from the DOM entirely (not merely hidden via CSS) — confirm via a DOM query, not a visibility check.

6. **action** (adversarial — prop-driven, controlled mode): If the harness exposes a "controlled selectedPathId" toggle (an external state variable bound to `selectedPathId` + `onPathChange`), set it to a fixed value and click a DIFFERENT path row in the drawer.
   **expected**: `onPathChange` fires with the clicked path's id, but the visually-selected row does NOT change until the harness's own controlled state is updated and fed back in — confirms the drawer never silently manages its own selection once a `selectedPathId` prop (even `null`) is supplied.

## Assertions

- MUST: exactly one path row (or none) carries `aria-selected="true"` at any time.
- MUST: clicking an already-selected row deselects it (toggle), never re-selects it.
- MUST: a zero-path graph renders no drawer element at all.
- MUST NOT: selecting a path ever mutates the underlying chart/graph data — only visual dim/highlight state changes.
- MUST NOT: a controlled `selectedPathId` prop ever be silently overridden by an internal click without the consumer's `onPathChange` firing.

## Report

POST the results (JSON with explicit boolean `ok`) to `POST /api/v1/manual-results/select-path`. Also print the full results as a human-readable fallback. If any step fails twice, record the flow FAIL with a note and STOP — do not loop the step.
