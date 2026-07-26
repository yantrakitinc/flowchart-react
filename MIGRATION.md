# Migration guide — v1 → v2

v2 is a clean-break rewrite: diagrams are authored as Mermaid-like text (or an IR object) and
rendered on React Flow, with movie-mode playback added.

## 1. Install
```bash
pnpm add @yantrakit/flowchart-react
pnpm add elkjs   # optional — only for layoutEngine={elkEngine}
```
Keep `import '@yantrakit/flowchart-react/styles'`; render `<FlowChart>` inside a client component.

## 2. Replace the `flow` prop
- **v1:** `<FlowChart flow={{id,name,nodes,edges}} onNodeClick={(node)=>…} />`
- **v2 object:** `<FlowChart graph={{id,name,direction:'TD',nodes,edges}} onNodeClick={(id,data)=>…} />`
- **v2 text:** `<FlowChart chart={"flowchart TD\n a --> b"} />`

## 3. Data-model changes
| v1 | v2 |
|----|----|
| `iFlowDefinition` | `iFlowGraph` (adds required `direction`) |
| edge `type` optional, no `id` | edge requires `id` **and** `type` (`'default'` if neutral) |
| node type `'process'` | `'action'` |
| `onNodeClick(node)` | `onNodeClick(nodeId, data)` |

## 4. Removed exports
`calculateLayout` → `layout(graph)` (async, pluggable engine). `getNodeColor`/`getEdgeColor`/
`getPathColor`/`getPathBgColor` → colors are CSS custom properties (`--fc-node-*`, `--fc-edge-*`).
`iLayoutConfig` → `iLayoutOptions`.

## 5. New in v2
- **Text authoring** + standalone `parseFlowchart` / `serializeFlowchart`.
- **Pluggable layout** (`elkEngine` opt-in), directions `TD/BT/LR/RL`.
- **Custom nodes** via `nodeTypes`; **IR JSON Schema** at `@yantrakit/flowchart-react/schema`.
- **Movie mode**: `autoPlay`, `onPlaybackStep(nodeId,index,data)`, `usePlayback`, `PlaybackControls`.
- **Agent/test affordances**: `data-testid` / `data-node-id` / `data-agent-action` everywhere.

## 6. Theming
Override the `--fc-*` CSS custom properties instead of the removed color helpers.
