# usePaths

## Purpose

Runs `detectPaths` over `graph` and manages the "currently selected path" state. Uncontrolled by
default (internal `useState`); passing `controlledId` (any value other than `undefined`, including
`null`) makes the hook a thin wrapper around the caller's own state instead.

## Paths

See the `paths:` field in the machine spec fenced block below for the full happy / edge-case enumeration.

```yaml
flow: usePaths
kind: hook
source: src/react/usePaths.ts
symbol: usePaths
inputs:
  graph: "iFlowGraph — the flow graph to detect paths over"
  controlledId: "string | null | undefined — when not undefined, the hook becomes controlled and mirrors this value instead of internal state"
  onChange: "((pathId: string | null) => void)? — fired whenever setSelectedPathId is called, controlled or not"
returns:
  - "iUsePathsResult — { paths, detection, selectedPathId, selectedPath, setSelectedPathId }"
throws: []
calls:
  - detectPaths (../paths/detectPaths)
called_by:
  - "src/react/FlowChart.tsx"
emits_events: []
side_effects_on_success:
  - "none directly — setSelectedPathId may update internal React state (uncontrolled mode) and/or invoke onChange"
side_effects_on_failure: "n/a — usePaths never throws (detectPaths never throws)"
transaction: none
test: src/react/usePaths.test.ts
spec: src/react/__specs__/spec.md
ai_agent_action:
  when_to_call: "internal to FlowChart's composition — not an independent chat-agent action; consult src/paths/__specs__/flows/detect-paths.flow.md for the underlying detection semantics"
  when_not_to_call: "n/a — not independently agent-invocable"
  natural_language_examples:
    - "n/a — not independently agent-invocable"
  agent_invocation: "internal — React hook call, not callable over HTTP/CLI/UI directly"
  confirm_with_user_before: "none — read-only detection + in-memory selection state"
  summarize_to_user_after: "n/a — has no independent user-facing outcome"
paths:
  happy_uncontrolled:
    - "controlledId is undefined -> isControlled is false -> selectedPathId tracks the hook's own uncontrolledId state"
    - "setSelectedPathId(id) updates the internal uncontrolledId AND invokes onChange?.(id)"
  happy_controlled:
    - "controlledId is any value other than undefined (including null) -> isControlled is true -> selectedPathId mirrors controlledId verbatim"
    - "setSelectedPathId(id) does NOT update any internal state — it only invokes onChange?.(id); the caller is responsible for feeding the new value back in as controlledId"
  edge_boundary_graph_identity_memo:
    - "detectPaths only re-runs (useMemo) when the `graph` object identity changes — passing a structurally-identical but newly-allocated graph re-runs detection; passing the same reference across renders does not"
  edge_boundary_selected_path_not_found:
    - "selectedPathId does not match any path.id in detection.paths (e.g. stale id after the graph changed)"
    - "selectedPath resolves to null (Array.find returns undefined, coalesced to null) — no error, no throw"
mermaid: |
  flowchart TD
    A[usePaths graph, controlledId, onChange] --> B[detectPaths graph via useMemo]
    B --> C{controlledId undefined?}
    C -->|yes| D[selectedPathId = uncontrolledId state]
    C -->|no| E[selectedPathId = controlledId]
    D --> F[setSelectedPathId updates uncontrolledId + onChange]
    E --> G[setSelectedPathId only calls onChange]
```
