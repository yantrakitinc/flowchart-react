// SETUP: React-layer port — component props, per-node data shape, and the node-type registry.
import type { ComponentType } from 'react';
import type { NodeProps } from '@xyflow/react';
import { iDirection, iFlowGraph, iNodeType } from '../ir/types';
import { iLayoutEngine } from '../layout/types';

/** Data attached to every React Flow node rendered by this package. */
export interface iFlowNodeData {
  label: string;
  type: iNodeType;
  description?: string;
  /** Flow direction — drives handle placement. */
  direction: iDirection;
  /** True when the node is on the currently-selected path (else undefined). */
  onSelectedPath?: boolean;
  /** True when another path is selected and this node is not on it. */
  dimmed?: boolean;
  /** True when this node is the `activeNodeId`. */
  active?: boolean;
  /** Arbitrary consumer payload carried through from iFlowNode.data. */
  [key: string]: unknown;
}

/** A registry maps each semantic node type to the React component that renders it. */
export type iNodeRegistry = Partial<Record<iNodeType, ComponentType<NodeProps>>>;

/** Where the path-selector drawer sits relative to the canvas. */
export type iDrawerPosition = 'top' | 'bottom' | 'left' | 'right';

/** Props for {@link FlowChart}. Exactly one of `chart` | `graph` is required. */
export interface iFlowChartProps {
  /** Author the diagram as Mermaid-like DSL text. */
  chart?: string;
  /** Author the diagram as the IR object. */
  graph?: iFlowGraph;
  /** Override node components per semantic type (merged over the rich defaults). */
  nodeTypes?: iNodeRegistry;
  /** Layout engine (defaults to dagre). */
  layoutEngine?: iLayoutEngine;
  /** Override the direction from the DSL header / graph. */
  direction?: iDirection;
  /** Highlight one node by id. */
  activeNodeId?: string;
  /** Controlled: id of the highlighted path. */
  selectedPathId?: string | null;
  /** Fired when the selected path changes (drawer click or deselect). */
  onPathChange?: (pathId: string | null) => void;
  /** Fired when a node is clicked. */
  onNodeClick?: (nodeId: string, data: iFlowNodeData) => void;
  /** Show the path-selector drawer (default true). */
  showPathDrawer?: boolean;
  /** Drawer placement (default 'right'). */
  pathDrawerPosition?: iDrawerPosition;
  /** Show the React Flow minimap (default false). */
  showMiniMap?: boolean;
  /** Show the React Flow zoom/pan controls (default true). */
  showControls?: boolean;
  /** Extra class on the container. */
  className?: string;
  /** Explicit container height (default 480). */
  height?: string | number;
}
