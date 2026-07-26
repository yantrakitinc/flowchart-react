// SETUP FILE. layout port — renderer-agnostic position computation. This layer knows
// nothing about React/@xyflow; it turns an iFlowGraph into x/y coordinates.

import type { iDirection, iFlowEdge, iFlowGraph, iFlowNode } from '../ir/types';

/** A node with its computed top-left position and box size. */
export interface iPositionedNode extends iFlowNode {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** An edge as handed to the renderer; layout does not compute edge geometry. */
export type iRenderEdge = iFlowEdge;

/** A fully laid-out graph, ready for a renderer to consume. */
export interface iPositionedGraph {
  nodes: iPositionedNode[];
  edges: iRenderEdge[];
  direction: iDirection;
  width: number;
  height: number;
}

/** Options accepted by {@link layout}. */
export interface iLayoutOptions {
  /** Layout engine to use. Defaults to the bundled dagre engine. */
  engine?: iLayoutEngine;
  /** Box width applied to every node before layout. Default `180`. */
  nodeWidth?: number;
  /** Box height applied to every node before layout. Default `64`. */
  nodeHeight?: number;
  /** Spacing between ranks (the layout's primary axis). Default `80`. */
  rankSpacing?: number;
  /** Spacing between nodes within the same rank. Default `48`. */
  nodeSpacing?: number;
}

/** Resolved, engine-facing layout parameters (defaults already applied). */
export interface iEngineContext {
  direction: iDirection;
  nodeWidth: number;
  nodeHeight: number;
  rankSpacing: number;
  nodeSpacing: number;
}

/** Node id → computed top-left position. */
export type iPositions = Map<string, { x: number; y: number }>;

/** A pluggable layout engine. */
export interface iLayoutEngine {
  /** Human-readable engine name, e.g. `'dagre'` or `'elk'`. */
  name: string;
  /** Computes a position for every node in `graph`. */
  run(graph: iFlowGraph, ctx: iEngineContext): Promise<iPositions>;
}
