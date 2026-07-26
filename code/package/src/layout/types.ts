// SETUP: layout port — maps the IR to positioned geometry, kept renderer-agnostic (no
// @xyflow imports) so engines stay pure + testable. The React layer adapts an
// iPositionedGraph into React Flow nodes/edges.
import { iDirection, iEdgeType, iFlowGraph, iNodeType } from '../ir/types';

/** A node with computed top-left position and measured size. */
export interface iPositionedNode {
  id: string;
  type: iNodeType;
  label: string;
  description?: string;
  data?: Record<string, unknown>;
  position: { x: number; y: number };
  width: number;
  height: number;
}

/** A render-ready edge (renderer-neutral). */
export interface iRenderEdge {
  id: string;
  source: string;
  target: string;
  type: iEdgeType;
  label?: string;
}

/** The positioned graph handed to the renderer. */
export interface iPositionedGraph {
  direction: iDirection;
  nodes: iPositionedNode[];
  edges: iRenderEdge[];
}

/** Per-run layout tuning. */
export interface iLayoutOptions {
  engine?: iLayoutEngine;
  nodeWidth?: number;
  nodeHeight?: number;
  rankSpacing?: number;
  nodeSpacing?: number;
}

/** Resolved options passed to an engine (no undefined fields). */
export interface iEngineContext {
  direction: iDirection;
  nodeWidth: number;
  nodeHeight: number;
  rankSpacing: number;
  nodeSpacing: number;
}

/** Computed positions keyed by node id (top-left coordinates). */
export type iPositions = Map<string, { x: number; y: number }>;

/** A pluggable layout strategy. Async so heavier engines (ELK) fit the same shape. */
export interface iLayoutEngine {
  readonly name: string;
  run(graph: iFlowGraph, ctx: iEngineContext): Promise<iPositions>;
}
