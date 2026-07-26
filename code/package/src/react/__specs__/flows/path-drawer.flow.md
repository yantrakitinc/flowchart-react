# PathDrawer

## Purpose

Lists every path detected by `detectPaths`, letting the caller select one to highlight on the canvas.
Clicking the already-selected path deselects it. Renders nothing when there are no paths to show.

## Paths

See the `paths:` field in the machine spec fenced block below for the full happy / edge-case enumeration.

```yaml
flow: PathDrawer
kind: composition-root
source: src/react/PathDrawer.tsx
symbol: PathDrawer
inputs:
  paths: "iFlowPath[] — every detected path to list"
  selectedPathId: "string | null | undefined — currently selected path id, or null/undefined when none is selected"
  onSelect: "(pathId: string | null) => void — fired with the clicked path's id, or null when re-clicking the selected path (deselect)"
returns:
  - "null — when `paths` is empty"
  - "JSX.Element — fc-path-drawer list, one fc-path-<id> button per path"
throws: []
calls: []
called_by:
  - "src/react/FlowChart.tsx (rendered when showPathDrawer is true and paths.length > 0)"
emits_events: []
side_effects_on_success:
  - "invokes the caller's onSelect(pathId) callback when a path button is clicked"
side_effects_on_failure: none
transaction: none
test: src/react/PathDrawer.test.tsx
spec: src/react/__specs__/spec.md
ai_agent_action:
  when_to_call: "the user wants to see the list of detected paths through the current flowchart, or select/deselect one to highlight"
  when_not_to_call: "the graph has zero detected paths (the component renders nothing) — the caller should surface that the diagram has no start/end routes instead"
  natural_language_examples:
    - "Show me the list of paths through this flowchart"
    - "Highlight the happy path"
    - "Deselect the currently highlighted path"
  agent_invocation: "UI click on [data-testid=\"fc-path-<id>\"] (data-agent-action=\"select-path\", data-path-id=\"<id>\")"
  confirm_with_user_before: "none — read-only selection toggle, no destructive action"
  summarize_to_user_after: "Selected path \"<name>\" (<type>)." / "Deselected the highlighted path."
paths:
  happy:
    - "paths has N entries; the drawer renders data-testid=\"fc-path-drawer\" with one <li> per path"
    - "each button carries data-testid=\"fc-path-<id>\", data-agent-action=\"select-path\", data-path-id=\"<id>\", aria-pressed matching whether path.id === selectedPathId"
    - "each button shows a colored dot (DOT_COLOR_BY_TYPE[path.type]), the path's name, and its type label"
  happy_select:
    - "user clicks an unselected path's button"
    - "onSelect(path.id) is invoked (selected was false, so the click passes the clicked path's own id, not null)"
  happy_deselect:
    - "user clicks the currently-selected path's button (selected === true)"
    - "onSelect(null) is invoked — re-clicking the selected path clears the selection"
  edge_boundary_empty_paths:
    - "paths is []"
    - "the component returns null before rendering any markup — no fc-path-drawer container is mounted at all"
  edge_boundary_no_selection:
    - "selectedPathId is null or undefined and no path.id matches it"
    - "every button renders aria-pressed=\"false\"; none carries the fc-path-drawer-item--selected class"
mermaid: |
  flowchart TD
    A[paths prop] --> B{paths.length === 0?}
    B -->|yes| C[render null]
    B -->|no| D[render fc-path-drawer list]
    D --> E{button clicked}
    E -->|already selected| F[onSelect null]
    E -->|not selected| G[onSelect path.id]
```
