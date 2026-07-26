# select-path

## Purpose

Lets the caller select/deselect a detected path from the PathDrawer, highlighting its nodes/edges.

## Paths

See the `paths:` field in the machine spec fenced block below for the full happy / edge-case enumeration.

```yaml
flow: usePaths
kind: helper
source: src/react/usePaths.ts
symbol: usePaths
inputs:
  graph: "iFlowGraph — the graph to detect paths over"
  controlledId: "string | null | undefined — pass any value other than undefined (incl. null) to control selection externally"
  onChange: "((pathId: string | null) => void)? — fired on every select/deselect, controlled or not"
returns:
  - "iUsePathsResult { paths, detection, selectedPathId, selectedPath, setSelectedPathId }"
throws: []
calls:
  - detectPaths (../paths/detectPaths)
called_by:
  - FlowChart (drives PathDrawer + canvas highlight)
emits_events: []
side_effects_on_success:
  - "updates internal uncontrolled selection state (only in uncontrolled mode)"
  - "invokes the `onChange` callback, in both controlled and uncontrolled mode"
side_effects_on_failure: none
transaction: none
test: src/react/usePaths.test.ts
spec: src/react/__specs__/spec.md
ai_agent_action:
  when_to_call: "The user clicks a path in the drawer (or the caller drives selection externally via `selectedPathId`) to highlight one detected route on the canvas."
  when_not_to_call: "The graph has no detected paths (drawer renders nothing) — there is nothing to select."
  natural_language_examples:
    - "Highlight the error path"
    - "Show me Path 2"
    - "Clear the highlighted path"
  agent_invocation: "UI click on [data-testid=\"fc-path-<id>\"] (data-agent-action=\"select-path\") inside the fc-path-drawer"
  confirm_with_user_before: "none — read-only selection, fully reversible"
  summarize_to_user_after: "Highlighted \"<path.name>\" (<path.type>)." 
paths:
  happy:
    - "user clicks a PathDrawer item (data-testid=\"fc-path-<id>\", data-agent-action=\"select-path\", data-path-id=<id>)"
    - "PathDrawer's onSelect(path.id) fires (re-clicking the already-selected item instead fires onSelect(null) — see edge below)"
    - "setSelectedPathId(path.id) runs: in uncontrolled mode, internal state updates; onChange(path.id) fires regardless of mode"
    - "selectedPath resolves via detection.paths.find(id) -> FlowChart recomputes highlightNodeIds/highlightEdgeIds from the found path"
    - "nodes/edges on the path render onSelectedPath=true (fc-node--on-path, full-opacity edge); every other node/edge renders dimmed=true (fc-node--dimmed, opacity 0.2 edge)"
  happy_deselect:
    - "user clicks the SAME PathDrawer item that is already selected (aria-pressed=\"true\")"
    - "PathDrawer's click handler computes `selected ? null : path.id` -> calls onSelect(null)"
    - "setSelectedPathId(null) runs -> selectedPath resolves to null -> highlightNodeIds/highlightEdgeIds both resolve to null -> FlowChart applies NO highlight/dimming to any node or edge"
  edge_controlled_mode:
    - "caller passes a `selectedPathId` prop to FlowChart (any value including explicit `undefined` differs from omitting the prop entirely only insofar as JS treats both as \"not controlling\")"
    - "isControlled = controlledId !== undefined; when true, clicking a PathDrawer item does NOT update usePaths' own internal state — the caller must re-render with a new `selectedPathId` for the highlight to move"
    - "onChange still fires on every click either way, so a controlling caller can react to the click and update its own state"
  edge_authority: "n/a — no permission/ownership boundary; path selection is a public, non-destructive, purely visual operation with no DB or auth surface to check"
  edge_boundary_unknown_path_id:
    - "`selectedPathId` (controlled) — or a stale internal id after the graph changed — refers to a path.id absent from the current `detection.paths`"
    - "`selectedPath` resolves to null (Array#find returns undefined, coalesced to null)"
    - "FlowChart's highlight memo treats a falsy `paths.selectedPath` as \"no selection\" -> no highlight/dimming is applied, and nothing throws"
  edge_boundary_graph_changes_underneath_selection:
    - "the `graph` argument changes identity (new `chart`/`graph` prop) while a path was selected"
    - "`detection` recomputes (useMemo keyed on `graph`) and issues new path ids"
    - "the previously-selected id very likely no longer matches any new path -> same resolution as the unknown-path-id edge above: selectedPath -> null, highlight clears, no crash, no stale cross-graph highlight lingers"
mermaid: |
  flowchart TD
    A[user clicks fc-path-<id>] --> B{already selected?}
    B -->|no| C[onSelect(path.id)]
    B -->|yes| D[onSelect(null)]
    C --> E[setSelectedPathId]
    D --> E
    E --> F{isControlled?}
    F -->|no| G[update internal uncontrolledId]
    F -->|yes| H[caller owns state; only onChange fires]
    G --> I[onChange fires]
    H --> I
    I --> J[selectedPath = detection.paths.find(id) ?? null]
    J --> K[FlowChart recomputes highlightNodeIds/highlightEdgeIds]
    K --> L[canvas re-renders on-path vs dimmed nodes/edges]
```
