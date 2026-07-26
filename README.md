# @yantrakit/flowchart-react

## GitHub Identity

This repository is owned by the **`yantrakitinc`** GitHub account. All `git` and `gh` operations on this repo must use the `yantrakitinc` identity, not personal accounts.

```bash
gh auth switch -u yantrakitinc -h github.com
git config user.name yantrakitinc
git config user.email yantrakitinc@gmail.com
```

A **Mermaid-like, AI-first React flowchart**. Author diagrams as text (diagram-as-code) or as an
object; they render on **React Flow** with a real interactive UI per node, automatic layout, and
semantic path detection.

**GitHub Repo:** https://github.com/yantrakitinc/flowchart-react
**[Docs & live demo →](https://yantrakit.com/flowchart-react)**

> **v2 is a breaking rewrite of v1.** Upgrading? See [`MIGRATION.md`](./MIGRATION.md).
> **Using this from an AI agent?** See [`AGENTS.md`](./AGENTS.md) for the machine-facing contract.

## Installation

```bash
pnpm add @yantrakit/flowchart-react
# peers: react >=18, react-dom >=18 · optional: elkjs (for the ELK layout engine)
```

## Usage — author with text

```tsx
import { FlowChart } from '@yantrakit/flowchart-react';
import '@yantrakit/flowchart-react/styles'; // required (bundles React Flow's base CSS)

function App() {
  return (
    <FlowChart
      height={500}
      chart={`flowchart TD
        start([Start]) --> pay{Payment OK?}
        pay -->|yes| ship[Ship order]
        pay ==>|no| fail[Show error]:::error
        ship --> done([Done])
        fail --> done`}
      onNodeClick={(id) => console.log('Clicked:', id)}
    />
  );
}
```

> React Flow is client-side — render `<FlowChart>` inside a client component (add `'use client'`
> in the Next.js app router).

## Usage — author with an object

```tsx
<FlowChart graph={{
  id: 'checkout', name: 'Checkout', direction: 'TD',
  nodes: [
    { id: 'start', label: 'Start', type: 'start' },
    { id: 'pay',   label: 'Payment OK?', type: 'decision' },
    { id: 'ship',  label: 'Ship order', type: 'action' },
  ],
  edges: [
    { id: 'e0', from: 'start', to: 'pay',  type: 'default' },
    { id: 'e1', from: 'pay',   to: 'ship', type: 'happy', label: 'yes' },
  ],
}} />
```

## DSL syntax

| Syntax | Meaning |
|--------|---------|
| `flowchart TD` | header — direction `TD` / `BT` / `LR` / `RL` (required; `TB`→`TD`) |
| `id[Label]` / `id{Label}` / `id([Label])` | action / decision / start-end node |
| `id:::error` | explicit node type |
| `A --> B` / `A -.-> B` / `A ==> B` | default / warning / error edge |
| `A -->\|label\| B` | labeled edge |
| `A -->\|no\|:::happy B` | explicit edge type override |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `chart` | `string` | — | Diagram as DSL text (one of `chart`/`graph` required) |
| `graph` | `iFlowGraph` | — | Diagram as the IR object |
| `direction` | `'TD'\|'BT'\|'LR'\|'RL'` | from source | Override layout direction |
| `layoutEngine` | `iLayoutEngine` | `dagreEngine` | Pass `elkEngine` to opt into ELK |
| `nodeTypes` | `iNodeRegistry` | rich defaults | Replace node components per type |
| `activeNodeId` | `string` | — | Highlight one node |
| `selectedPathId` | `string \| null` | — | Controlled path highlight |
| `onPathChange` | `(id: string \| null) => void` | — | Path selection callback |
| `onNodeClick` | `(id: string, data) => void` | — | Node click callback |
| `pathDrawerPosition` | `'top'\|'bottom'\|'left'\|'right'` | `'right'` | Drawer placement |
| `showPathDrawer` / `showControls` / `showMiniMap` | `boolean` | `true`/`true`/`false` | Toggle UI chrome |
| `height` | `string \| number` | `480` | Container height |

Also exported (pure, no React): `parseFlowchart`, `serializeFlowchart`, `detectPaths`, `layout`, `dagreEngine`, `elkEngine`, `FLOW_GRAPH_SCHEMA`, plus the `usePaths` hook and the `iFlow*` types.

## Node & edge types

- **Nodes:** `start` · `end` · `action` · `decision` · `error` · `warning` · `link`
- **Edges:** `happy` · `warning` · `error` · `default` — the edge type colors any path through it.

## Features

- **Text or object authoring** — Mermaid-like `chart` string or the `graph` IR object
- **Rendered on React Flow** — custom node components, drag/zoom/pan, minimap, edge routing
- **Pluggable layout** — dagre (default) or ELK, honoring `TD`/`BT`/`LR`/`RL`
- **Semantic path detection** — happy / warning / error path coloring + selector drawer
- **AI-first** — standalone parser/serializer, published IR JSON Schema, `data-*` node affordances

## License

MIT © [Yantrakit Inc](https://yantrakit.com)
