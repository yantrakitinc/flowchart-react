# src/react — the interactive React-Flow rendering layer

## Concept

This folder is the published, consumer-facing surface of `@yantrakit/flowchart-react`: the one React component (`FlowChart`) a host application imports to turn a Mermaid-like DSL string or an `iFlowGraph` IR object into a live, clickable diagram. It sits at the top of the package's pipeline — parse (`../parse`) → layout (`../layout`) → path detection (`../paths`) → render (this folder) — and is the only layer that imports React or `@xyflow/react`. Every other folder in the package (`ir/`, `parse/`, `layout/`, `paths/`) is renderer-agnostic pure TypeScript; this folder is where that pure IR becomes pixels, and where the package's agent-affordance contract (data-node-id, data-agent-action, aria-label) is actually emitted into the DOM.

The component accepts exactly one of `chart` (DSL text) or `graph` (IR object) — never both required, never neither. It hands the resolved graph to the pluggable async `layoutEngine` (dagre by default), maps every node to a rich default component (one `FlowNode` handling all seven semantic types via icon/shape/color, overridable per-type through the `nodeTypes` registry), maps every edge through `toReactFlowEdge` for semantic (happy/warning/error/default) styling, and offers an optional `PathDrawer` — a list of every detected start→end path (via `usePaths`/`detectPaths`) the user can select to highlight (and dim everything else).

`ui_design: not-applicable` — this is a legacy backfill of an already-published, already-styled (v2.0.0) component: production behavior + the shipped `styles.css` token sheet are the design record. No fresh COMPONENT_CREATION design-lock cycle is being retrofitted onto pre-existing, shipping code.

## Files

1. `FlowChart.tsx` — the composition root. Resolves `chart`/`graph` into a graph (or a caught `FlowchartParseError`), runs the async layout effect (race-guarded against stale/unmounted resolutions), maps the positioned graph into React Flow `nodes`/`edges`, wires the node-type registry, the path drawer, and the `onNodeClick`/`onPathChange` callbacks.
2. `usePaths.ts` — detects paths (`detectPaths`) for a graph and manages (optionally controlled) selection state; reusable standalone by a consumer building a custom path UI.
3. `PathDrawer.tsx` — the built-in path-selector UI: an "All paths" reset row plus one row per detected path, colored by semantic path type.
4. `types.ts` — **SETUP**: the React-layer port — `iFlowChartProps`, `iFlowNodeData`, `iNodeRegistry`, `iDrawerPosition`. No behavior; type declarations only.
5. `nodes/FlowNode.tsx` — the rich default node component: one component renders all seven semantic node types (start/end/action/decision/error/warning/link) via icon + shape + CSS-token color, plus an expand/collapse toggle for an optional description.
6. `nodes/registry.ts` — `defaultNodeTypes` (every semantic type → `FlowNode`) and `resolveNodeTypes` (merges consumer overrides over the defaults).
7. `edges/edgeStyle.ts` — `toReactFlowEdge`: maps a semantic edge type to React Flow visuals (stroke color via CSS token, width, dash pattern for warnings, dim opacity when another path is selected).
8. `index.ts` — **SETUP**: the package's public barrel — re-exports `FlowChart`, `FlowNode`, `defaultNodeTypes`, `resolveNodeTypes`, `PathDrawer`, `usePaths`, and the public types.

## Out of scope

- Parsing the Mermaid-like DSL (owned by `../parse/parseFlowchart` — this folder only calls it and renders its result or its thrown `FlowchartParseError`).
- Computing node positions (owned by `../layout/layout` and its pluggable `iLayoutEngine`; this folder only awaits the result).
- Enumerating/classifying start→end paths (owned by `../paths/detectPaths`; `usePaths` only calls it and manages selection).
- Any DB, HTTP, or server-side concern — this is a 100% client-side rendering component with no network I/O, no persistence, and no authentication/authorization surface of its own.
- Localizing the package's own 3 chrome strings ("Laying out…", "Flowchart parse error", "All paths") — not routed through an i18n layer (see `cross_cutting.i18n` in spec.yaml).
- Auto-adapting the path drawer's position/size to viewport width — the host chooses `pathDrawerPosition`/`showPathDrawer` explicitly.
