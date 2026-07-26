# AGENTS.md — `@yantrakit/flowchart-react` (v2)

> Machine-facing integration guide, verified against the shipped v2 source. If a symbol/prop/type
> is not listed here, it does not exist — do not invent it.

## 0. TL;DR

A Mermaid-like, AI-first React flowchart on React Flow. Author a diagram as **text** (`chart`) or
an **object** (`graph`); every node is a real interactive React component. Includes a **movie
mode** that auto-plays a path node-by-node.

```tsx
import { FlowChart } from '@yantrakit/flowchart-react';
import '@yantrakit/flowchart-react/styles'; // REQUIRED
<FlowChart height={500} chart={`flowchart TD
  start([Start]) --> pay{Payment OK?}
  pay -->|yes| ship[Ship order]
  pay ==>|no| fail[Show error]:::error`} />
```

Render inside a client component (React Flow is client-side).

## 1. The DSL (for `chart`)
- Header required: `flowchart <TD|BT|LR|RL>` / `graph <…>` (`TB`→`TD`).
- Nodes: `id[Label]`=action · `id{Label}`=decision · `id([Label])`=start/end-by-position · `id:::TYPE` explicit (`start|end|action|decision|error|warning|link`).
- Edges: `-->` default · `-.->` warning · `==>` error · `|label|` · `:::edgeType` override (`happy|warning|error|default`).
- ids `[A-Za-z0-9_]+`; `%%` comments; chains `A --> B --> C`. Resolution: node type = explicit→shape→position; edge type = explicit→glyph.
- Malformed input throws `FlowchartParseError { line, column, reason }`; inside `<FlowChart>` renders an inline error box.

## 2. The IR (for `graph`)
```ts
type iNodeType='start'|'end'|'action'|'decision'|'error'|'warning'|'link';
type iEdgeType='happy'|'warning'|'error'|'default';  type iDirection='TD'|'BT'|'LR'|'RL';
interface iFlowNode{id;label;type:iNodeType;description?;data?:Record<string,unknown>}
interface iFlowEdge{id;from;to;type:iEdgeType;label?}
interface iFlowGraph{id;name;direction:iDirection;nodes:iFlowNode[];edges:iFlowEdge[]}
```

## 3. `<FlowChart>` props
`chart?` | `graph?` (one required), `nodeTypes?`, `layoutEngine?`, `direction?`, `activeNodeId?`,
`selectedPathId?`, `onPathChange?(id)`, `onNodeClick?(id, data)`, `showPathDrawer?` (true),
`pathDrawerPosition?` ('right'), `showMiniMap?` (false), `showControls?` (true), `className?`,
`height?` (480). **Movie mode:** `autoPlay?` (false), `playbackSpeedMs?` (1200), `loop?` (false),
`showPlaybackControls?` (true), `onPlaybackStep?(nodeId, index, data)`, `onPlaybackEnd?()`.

## 4. Per-node → screen, and movie mode
- Click: `onNodeClick(nodeId, data)` fires per node — associate a screen with each node.
- Movie mode: with `autoPlay` (or the playback controls), the component walks a path — the
  **selected path**, or the **first detected path** if none selected — firing
  `onPlaybackStep(nodeId, index, data)` per node so a parent can swap to that node's screen.
  `usePlayback(path, opts)` + `PlaybackControls` are exported for custom playback UIs.

## 5. Exports
Component/hook: `FlowChart`, `FlowNode`, `PathDrawer`, `PlaybackControls`, `usePaths`,
`usePlayback`, `defaultNodeTypes`, `resolveNodeTypes`.
Pure (no React): `parseFlowchart`, `serializeFlowchart`, `detectPaths`, `layout`, `dagreEngine`,
`elkEngine`, `FlowchartParseError`, `FLOW_GRAPH_SCHEMA`, `NODE_TYPES`, `EDGE_TYPES`, `DIRECTIONS`,
`isNodeType`, `isEdgeType`, `isDirection`.

## 6. Selectors (stable, for tests + agents)
- Node `[data-testid="fc-node-<id>"]` (`data-node-id`, `data-node-type`, `data-agent-action="select-node"`, `aria-label`); expand `[data-testid="fc-node-<id>-expand"]`.
- Drawer `[data-testid="fc-path-drawer"]`; item `[data-testid="fc-path-<id>"]` (`data-agent-action="select-path"`, `data-path-id`).
- Playback `[data-testid="fc-playback"]`; buttons `[data-testid="fc-playback-{play|pause|restart|step-back|step-forward}"]`.
- Container `[data-testid="fc-flowchart"]`; parse-error box `[data-testid="fc-parse-error"]`.

## 7. Not available
The v1 `flow` prop, `iFlowDefinition`, `calculateLayout`, `getNodeColor/getEdgeColor/getPathColor/getPathBgColor`, node type `'process'`. Subgraphs, non-flowchart Mermaid diagram types, Mermaid styling directives.
