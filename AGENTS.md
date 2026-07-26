# AGENTS.md — `@yantrakit/flowchart-react` (v2)

> Machine-facing integration guide, verified against the shipped v2 source. If a symbol/prop/type
> is not listed here, it does not exist — do not invent it.

## 0. TL;DR

A Mermaid-like, AI-first React flowchart rendered on React Flow. Author a diagram as **text**
(`chart`) or an **object** (`graph`); every node is a real interactive React component.

```tsx
import { FlowChart } from '@yantrakit/flowchart-react';
import '@yantrakit/flowchart-react/styles'; // REQUIRED (bundles React Flow's base CSS)

<FlowChart height={500} chart={`flowchart TD
  start([Start]) --> pay{Payment OK?}
  pay -->|yes| ship[Ship order]
  pay ==>|no| fail[Show error]:::error
  ship --> done([Done])
  fail --> done`} />
```

Two rules: import the stylesheet, and render inside a client component (React Flow is client-side).

## 1. Module facts

| Fact | Value |
|------|-------|
| Name / version | `@yantrakit/flowchart-react` · `2.0.0` |
| Peers | `react >=18`, `react-dom >=18`; `elkjs` optional (ELK engine only) |
| Runtime deps | `@xyflow/react`, `dagre` |
| Entry points | `.` (code), `./styles` (CSS), `./schema` (IR JSON Schema) |

## 2. The DSL (for `chart`)

- Header **required**: `flowchart <TD|BT|LR|RL>` / `graph <…>` (`TB`→`TD`).
- Nodes: `id[Label]`=action · `id{Label}`=decision · `id([Label])`=start/end-by-position · `id:::TYPE` explicit (`start|end|action|decision|error|warning|link`).
- Edges: `-->` default · `-.->` warning · `==>` error · `|label|` · `:::edgeType` override (`happy|warning|error|default`).
- Node ids `[A-Za-z0-9_]+`; `%%` comments; chains `A --> B --> C`.
- Resolution: node type = explicit class → shape → graph position; edge type = explicit class → glyph.
- Malformed input throws `FlowchartParseError { line, column, reason }`; inside `<FlowChart>` it renders an inline error box.

## 3. The IR (for `graph`)

```ts
type iNodeType = 'start'|'end'|'action'|'decision'|'error'|'warning'|'link';
type iEdgeType = 'happy'|'warning'|'error'|'default';
type iDirection = 'TD'|'BT'|'LR'|'RL';
interface iFlowNode { id: string; label: string; type: iNodeType; description?: string; data?: Record<string, unknown>; }
interface iFlowEdge { id: string; from: string; to: string; type: iEdgeType; label?: string; }
interface iFlowGraph { id: string; name: string; direction: iDirection; nodes: iFlowNode[]; edges: iFlowEdge[]; }
```

vs v1: edges now require `id` **and** `type`; the type is `iFlowGraph` (adds `direction`); `'process'` → `'action'`.

## 4. `<FlowChart>` props

`chart?` | `graph?` (exactly one required), `nodeTypes?`, `layoutEngine?`, `direction?`,
`activeNodeId?`, `selectedPathId?`, `onPathChange?(id)`, `onNodeClick?(id, data)`,
`showPathDrawer?` (true), `pathDrawerPosition?` ('right'), `showMiniMap?` (false),
`showControls?` (true), `className?`, `height?` (480).

## 5. Exports

Component/hook: `FlowChart`, `FlowNode`, `PathDrawer`, `usePaths`, `defaultNodeTypes`, `resolveNodeTypes`.
Pure (no React): `parseFlowchart`, `serializeFlowchart`, `detectPaths`, `layout`, `dagreEngine`, `elkEngine`, `FlowchartParseError`, `FLOW_GRAPH_SCHEMA`, `NODE_TYPES`, `EDGE_TYPES`, `DIRECTIONS`, `isNodeType`, `isEdgeType`, `isDirection`.

## 6. Headless recipes

```ts
import { parseFlowchart, serializeFlowchart, detectPaths, layout, elkEngine } from '@yantrakit/flowchart-react';
const graph = parseFlowchart('flowchart TD\n a --> b --> c'); // text → IR
const text  = serializeFlowchart(graph);                       // IR → text (round-trips)
const { paths } = detectPaths(graph);                          // semantic paths
const positioned = await layout(graph);                        // dagre positions
const viaElk    = await layout(graph, { engine: elkEngine });  // ELK (needs elkjs)
```

## 7. Selectors (stable, for tests + agents)

- Node: `[data-testid="fc-node-<id>"]`, `data-node-id`, `data-node-type`, `data-agent-action="select-node"`, `aria-label`.
- Expand: `[data-testid="fc-node-<id>-expand"]`, `data-agent-action="toggle-description"`.
- Drawer: `[data-testid="fc-path-drawer"]`; item `[data-testid="fc-path-<id>"]`, `data-agent-action="select-path"`, `data-path-id`.
- Container `[data-testid="fc-flowchart"]`; parse-error box `[data-testid="fc-parse-error"]`.

## 8. Not available (do not call)

- The v1 `flow` prop, `iFlowDefinition`, `calculateLayout`, `getNodeColor`/`getEdgeColor`/`getPathColor`/`getPathBgColor`, node type `'process'`.
- Subgraphs, non-flowchart Mermaid diagram types, Mermaid styling directives.
