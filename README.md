# @yantrakit/flowchart-react

## GitHub Identity

This repository is owned by the **`yantrakitinc`** GitHub account. All `git` and `gh` operations on this repo must use the `yantrakitinc` identity, not personal accounts.

```bash
gh auth switch -u yantrakitinc -h github.com
git config user.name yantrakitinc
git config user.email yantrakitinc@gmail.com
```

A **Mermaid-like, AI-first React flowchart**. Author diagrams as text (diagram-as-code) or as an
object; they render on **React Flow** with a real interactive UI per node, automatic layout,
semantic path detection, and a **movie mode** that plays a path node-by-node.

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
```

> React Flow is client-side — render `<FlowChart>` inside a client component (`'use client'` in the Next.js app router).

## Associate a screen with each node

`onNodeClick(nodeId, data)` fires on every node — wire your screenshot/route off it:

```tsx
<FlowChart chart={chart} onNodeClick={(id, data) => showScreenFor(id)} />
```

## Movie mode — auto-play a path

Play a path node-by-node while the flow highlights each step; `onPlaybackStep` lets the other
side of your screen swap to that node's UI state. Plays the selected path, or the **first**
detected path when none is selected.

```tsx
<FlowChart
  chart={chart}
  autoPlay            // start playing on mount (or use the play/pause/restart controls)
  loop
  playbackSpeedMs={1400}
  onPlaybackStep={(nodeId, index, data) => setCurrentScreen(nodeId)}
  onPlaybackEnd={() => console.log('done')}
/>
```

The `usePlayback` hook and `PlaybackControls` component are exported for custom playback UIs.

## DSL syntax

| Syntax | Meaning |
|--------|---------|
| `flowchart TD` | header — direction `TD` / `BT` / `LR` / `RL` (required; `TB`→`TD`) |
| `id[Label]` / `id{Label}` / `id([Label])` | action / decision / start-end node |
| `id:::error` | explicit node type |
| `A --> B` / `A -.-> B` / `A ==> B` | default / warning / error edge |
| `A -->\|label\| B` | labeled edge |
| `A -->\|no\|:::happy B` | explicit edge type override |

## Key props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `chart` / `graph` | `string` / `iFlowGraph` | — | Diagram source (exactly one required) |
| `direction` | `'TD'\|'BT'\|'LR'\|'RL'` | from source | Override layout direction |
| `layoutEngine` | `iLayoutEngine` | `dagreEngine` | Pass `elkEngine` for ELK |
| `nodeTypes` | `iNodeRegistry` | rich defaults | Replace node components per type |
| `activeNodeId` / `selectedPathId` | `string` | — | Highlight a node / a path |
| `onNodeClick` | `(id, data) => void` | — | Node click callback |
| `onPathChange` | `(id \| null) => void` | — | Path selection callback |
| `autoPlay` / `loop` | `boolean` | `false` | Movie mode: auto-play / loop a path |
| `playbackSpeedMs` | `number` | `1200` | Movie mode: ms per node |
| `onPlaybackStep` / `onPlaybackEnd` | callback | — | Movie mode: per-node / end callbacks |
| `showPlaybackControls` / `showPathDrawer` / `showControls` / `showMiniMap` | `boolean` | `true`/`true`/`true`/`false` | Toggle UI chrome |
| `height` | `string \| number` | `480` | Container height |

Also exported (pure, no React): `parseFlowchart`, `serializeFlowchart`, `detectPaths`, `layout`, `dagreEngine`, `elkEngine`, `FLOW_GRAPH_SCHEMA`, plus the `usePaths` / `usePlayback` hooks and `PlaybackControls`.

## Node & edge types

- **Nodes:** `start` · `end` · `action` · `decision` · `error` · `warning` · `link`
- **Edges:** `happy` · `warning` · `error` · `default` — the edge type colors any path through it.

## License

MIT © [Yantrakit Inc](https://yantrakit.com)
