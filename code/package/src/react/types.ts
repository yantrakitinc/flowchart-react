// SETUP FILE. React port — @xyflow/react-facing shapes. This is the only layer
// allowed to import '@xyflow/react'.

import type { ComponentType } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { iDirection, iFlowGraph, iNodeType } from '../ir/types';
import type { iLayoutEngine } from '../layout/types';

/** Data attached to every rendered React Flow node. */
export interface iFlowNodeData {
  /** Label rendered on the node. */
  label: string;
  /** Semantic node type, driving shape/color via `fc-node--<type>`. */
  type: iNodeType;
  /** Optional longer-form explanation, shown behind an expand affordance. */
  description?: string;
  /** Layout direction, used to orient connection handles. */
  direction: iDirection;
  /** Whether this node lies on the currently highlighted path (selection or playback). */
  onSelectedPath?: boolean;
  /** Whether this node should render faded (off the highlighted path). */
  dimmed?: boolean;
  /** Whether this is the current "active" node (`activeNodeId` or playback cursor). */
  active?: boolean;
  [key: string]: unknown;
}

/** Overridable map of node-type → custom renderer, merged over the package defaults. */
export type iNodeRegistry = Partial<Record<iNodeType, ComponentType<NodeProps>>>;

/** Where the path drawer docks relative to the canvas. */
export type iDrawerPosition = 'top' | 'bottom' | 'left' | 'right';

/** Props accepted by {@link FlowChart}. */
export interface iFlowChartProps {
  /** Mermaid-like flowchart DSL text. Mutually usable alongside `graph` (parsed first if both given, `graph` used when `chart` is absent). */
  chart?: string;
  /** A pre-built renderer-agnostic flow graph. Used when `chart` is not given. */
  graph?: iFlowGraph;
  /** Custom node renderers, merged over the package's default renderer for each type. */
  nodeTypes?: iNodeRegistry;
  /** Layout engine override. Defaults to the bundled dagre engine. */
  layoutEngine?: iLayoutEngine;
  /** Direction override, used when parsing `chart` text with no header line. */
  direction?: iDirection;
  /** Node id to render as the current "active" node. */
  activeNodeId?: string;
  /** Id of the path to highlight. Controlled — pass `undefined` for uncontrolled. */
  selectedPathId?: string;
  /** Fired when the highlighted path changes (selection or clear). */
  onPathChange?: (pathId: string | null) => void;
  /** Fired when a node is clicked. */
  onNodeClick?: (id: string, data: iFlowNodeData) => void;
  /** Show the path drawer listing detected paths. Default `true`. */
  showPathDrawer?: boolean;
  /** Path drawer dock position. Default `'right'`. */
  pathDrawerPosition?: iDrawerPosition;
  /** Show the React Flow MiniMap. Default `false`. */
  showMiniMap?: boolean;
  /** Show the React Flow Controls. Default `true`. */
  showControls?: boolean;
  /** Extra class name applied to the root container. */
  className?: string;
  /** Canvas height (number in px, or any CSS length string). Default `480`. */
  height?: number | string;
  /** Start path playback automatically once a playable path is available. Default `false`. */
  autoPlay?: boolean;
  /** Milliseconds between playback steps. Default `1200`. */
  playbackSpeedMs?: number;
  /** Restart playback from the first node after reaching the end. Default `false`. */
  loop?: boolean;
  /** Show the playback transport controls. Default `true`. */
  showPlaybackControls?: boolean;
  /** Fired on every playback step with the current node id, its index and its data. */
  onPlaybackStep?: (nodeId: string, index: number, data: iFlowNodeData) => void;
  /** Fired when playback reaches the end of the path (and is not looping). */
  onPlaybackEnd?: () => void;
}
