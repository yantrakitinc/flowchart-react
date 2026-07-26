/**
 * layout() — assemble a positioned graph from the IR using a pluggable engine.
 * Defaults to {@link dagreEngine}; pass `engine: elkEngine` (or any iLayoutEngine) to swap.
 */
import { iFlowGraph } from '../ir/types';
import { dagreEngine } from './dagreEngine';
import {
  iEngineContext,
  iLayoutOptions,
  iPositionedGraph,
  iPositionedNode,
  iRenderEdge,
} from './types';

const DEFAULTS = { nodeWidth: 180, nodeHeight: 64, rankSpacing: 80, nodeSpacing: 48 };

/** Position an IR graph with the chosen (or default dagre) engine. */
export async function layout(
  graph: iFlowGraph,
  options: iLayoutOptions = {}
): Promise<iPositionedGraph> {
  const engine = options.engine ?? dagreEngine;
  const ctx: iEngineContext = {
    direction: graph.direction,
    nodeWidth: options.nodeWidth ?? DEFAULTS.nodeWidth,
    nodeHeight: options.nodeHeight ?? DEFAULTS.nodeHeight,
    rankSpacing: options.rankSpacing ?? DEFAULTS.rankSpacing,
    nodeSpacing: options.nodeSpacing ?? DEFAULTS.nodeSpacing,
  };

  const positions = await engine.run(graph, ctx);

  const nodes: iPositionedNode[] = graph.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    label: n.label,
    ...(n.description !== undefined ? { description: n.description } : {}),
    ...(n.data !== undefined ? { data: n.data } : {}),
    position: positions.get(n.id) ?? { x: 0, y: 0 },
    width: ctx.nodeWidth,
    height: ctx.nodeHeight,
  }));

  const edges: iRenderEdge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.from,
    target: e.to,
    type: e.type,
    ...(e.label !== undefined ? { label: e.label } : {}),
  }));

  return { direction: graph.direction, nodes, edges };
}
