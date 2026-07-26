# Migration guide — v1 → v2

v2 is a **clean-break rewrite**: diagrams are authored as Mermaid-like text (or an IR object)
and rendered on React Flow. No automatic compatibility shim — update call sites as below.

## 1. Install

```bash
pnpm add @yantrakit/flowchart-react
pnpm add elkjs   # optional — only for `layoutEngine={elkEngine}`
```

Keep importing the stylesheet (it now also bundles React Flow's base CSS), and render
`<FlowChart>` inside a client component:

```ts
import '@yantrakit/flowchart-react/styles';
```

## 2. Replace the `flow` prop

**v1:** `<FlowChart flow={{ id, name, nodes, edges }} onNodeClick={(node) => …} />`

**v2 — object:** `<FlowChart graph={{ id, name, direction: 'TD', nodes, edges }} onNodeClick={(id, data) => …} />`

**v2 — text (new):**
```tsx
<FlowChart chart={`flowchart TD
  start([Start]) --> pay{Payment OK?}
  pay -->|yes| ship[Ship order]`} />
```

## 3. Data-model changes

| v1 | v2 |
|----|----|
| `iFlowDefinition` | `iFlowGraph` (adds required `direction`) |
| edge `type` optional, no `id` | edge requires `id` **and** `type` (`'default'` if neutral) |
| node type `'process'` | `'action'` |
| `onNodeClick(node)` | `onNodeClick(nodeId, data)` |

```diff
- const flow = { id, name, nodes: [{ id:'a', label:'A', type:'process' }],
-                edges: [{ from:'a', to:'b' }] };
+ const graph = { id, name, direction: 'TD',
+                 nodes: [{ id:'a', label:'A', type:'action' }],
+                 edges: [{ id:'e0', from:'a', to:'b', type:'default' }] };
```

## 4. Removed exports

- `calculateLayout` → `layout(graph)` (async, pluggable engine).
- `getNodeColor` / `getEdgeColor` / `getPathColor` / `getPathBgColor` → colors are CSS custom
  properties now (`--fc-node-start`, `--fc-edge-error`, …); retheme via CSS.
- `iLayoutConfig` → `iLayoutOptions` (`nodeWidth`, `nodeHeight`, `rankSpacing`, `nodeSpacing`).

## 5. New in v2

- **Text authoring** via `chart` + standalone `parseFlowchart` / `serializeFlowchart`.
- **Pluggable layout**: `layoutEngine={elkEngine}` for ELK; dagre is the default.
- **Custom nodes** via the `nodeTypes` registry.
- **Directions** `TD` / `BT` / `LR` / `RL` via the header or `direction` prop.
- **IR JSON Schema** at `@yantrakit/flowchart-react/schema`.
- **Agent/test affordances**: `data-testid` / `data-node-id` / `data-agent-action` on nodes.

## 6. Theming

Override the `--fc-*` CSS custom properties instead of the removed color helpers:

```css
:root {
  --fc-node-start: #2563eb;
  --fc-edge-error: #ef4444;
  /* …full token list in the shipped styles.css */
}
```
