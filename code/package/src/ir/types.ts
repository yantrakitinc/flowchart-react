// SETUP FILE. IR port — the renderer-agnostic flow graph model. Every other layer
// (parse, paths, layout, react) consumes this shape and nothing else.

/** Semantic role of a node in a flow graph. */
export type iNodeType = 'start' | 'end' | 'action' | 'decision' | 'error' | 'warning' | 'link';

/** Semantic classification of an edge in a flow graph. */
export type iEdgeType = 'happy' | 'warning' | 'error' | 'default';

/** Layout direction for a flow graph. */
export type iDirection = 'TD' | 'BT' | 'LR' | 'RL';

/** All valid {@link iNodeType} values, in a stable enumeration order. */
export const NODE_TYPES: readonly iNodeType[] = [
  'start',
  'end',
  'action',
  'decision',
  'error',
  'warning',
  'link',
];

/** All valid {@link iEdgeType} values, in a stable enumeration order. */
export const EDGE_TYPES: readonly iEdgeType[] = ['happy', 'warning', 'error', 'default'];

/** All valid {@link iDirection} values, in a stable enumeration order. */
export const DIRECTIONS: readonly iDirection[] = ['TD', 'BT', 'LR', 'RL'];

/** A single node in a flow graph. */
export interface iFlowNode {
  /** Stable identifier, unique within the graph. */
  id: string;
  /** Human-readable label rendered on the node. */
  label: string;
  /** Semantic role driving shape/color. */
  type: iNodeType;
  /** Optional longer-form explanation, shown behind an expand affordance. */
  description?: string;
  /** Opaque consumer payload, never interpreted by this package. */
  data?: Record<string, unknown>;
}

/** A single directed edge in a flow graph. */
export interface iFlowEdge {
  /** Stable identifier, unique within the graph. */
  id: string;
  /** Source node id. */
  from: string;
  /** Target node id. */
  to: string;
  /** Semantic classification driving color/style. */
  type: iEdgeType;
  /** Optional label rendered on the edge. */
  label?: string;
}

/** The full renderer-agnostic flow graph. */
export interface iFlowGraph {
  /** Stable identifier for the graph. */
  id: string;
  /** Human-readable name for the graph. */
  name: string;
  /** Layout direction. */
  direction: iDirection;
  /** All nodes in the graph. */
  nodes: iFlowNode[];
  /** All edges in the graph. */
  edges: iFlowEdge[];
}

/** Type guard for {@link iNodeType}. */
export function isNodeType(value: unknown): value is iNodeType {
  return typeof value === 'string' && (NODE_TYPES as readonly string[]).includes(value);
}

/** Type guard for {@link iEdgeType}. */
export function isEdgeType(value: unknown): value is iEdgeType {
  return typeof value === 'string' && (EDGE_TYPES as readonly string[]).includes(value);
}

/** Type guard for {@link iDirection}. */
export function isDirection(value: unknown): value is iDirection {
  return typeof value === 'string' && (DIRECTIONS as readonly string[]).includes(value);
}
