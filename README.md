# @yantrakit/flowchart-react

## GitHub Identity

This repository is owned by the **`yantrakitinc`** GitHub account. All `git` and `gh` operations on this repo must use the `yantrakitinc` identity, not personal accounts.

```bash
gh auth switch -u yantrakitinc -h github.com
git config user.name yantrakitinc
git config user.email yantrakitinc@gmail.com
```

A React flowchart component with automatic node layout, path detection, and interactive controls.

**GitHub Repo:** https://github.com/yantrakitinc/flowchart-react

**[View Documentation & Examples →](https://yantrakit.com/flowchart-react)**

## Installation

```bash
npm install @yantrakit/flowchart-react
# or
pnpm add @yantrakit/flowchart-react
```

## Usage

```tsx
import { FlowChart } from '@yantrakit/flowchart-react';
import '@yantrakit/flowchart-react/styles';

const nodes = [
  { id: 'start', label: 'Start', type: 'start' },
  { id: 'process', label: 'Process', type: 'process' },
  { id: 'end', label: 'End', type: 'end' },
];

const edges = [
  { from: 'start', to: 'process' },
  { from: 'process', to: 'end' },
];

function App() {
  return (
    <FlowChart
      nodes={nodes}
      edges={edges}
      onNodeClick={(node) => console.log('Clicked:', node)}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodes` | `FlowNode[]` | required | Array of node objects |
| `edges` | `FlowEdge[]` | required | Array of edge objects |
| `title` | `string` | - | Optional title displayed above the chart |
| `onNodeClick` | `(node) => void` | - | Callback when a node is clicked |
| `onPathSelect` | `(path) => void` | - | Callback when a path is selected |
| `className` | `string` | - | Additional CSS class for the container |

## Node Types

- `start` - Entry point (rounded rectangle)
- `end` - Exit point (rounded rectangle)
- `process` - Standard process step (rectangle)
- `decision` - Decision point (diamond shape)

## Features

- **Auto Layout** - Automatic node positioning based on graph structure
- **Path Detection** - Detects all paths from start to end nodes
- **Interactive Controls** - Zoom, pan, and click nodes
- **Path Filtering** - Select and highlight specific paths

## Documentation

For full documentation, interactive examples, and API reference, visit:

**[yantrakit.com/flowchart-react](https://yantrakit.com/flowchart-react)**

## License

MIT © [Yantrakit Inc](https://yantrakit.com)
