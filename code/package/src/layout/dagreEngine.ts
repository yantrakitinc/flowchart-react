import dagre from 'dagre';
import type { iDirection, iFlowGraph } from '../ir/types';
import type { iEngineContext, iLayoutEngine, iPositions } from './types';

/** Maps our {@link iDirection} vocabulary onto dagre's `rankdir` vocabulary. */
const RANKDIR_BY_DIRECTION: Record<iDirection, string> = {
  TD: 'TB',
  BT: 'BT',
  LR: 'LR',
  RL: 'RL',
};

function rankDirFor(direction: iDirection): string {
  return RANKDIR_BY_DIRECTION[direction];
}

/**
 * Default layout engine, backed by `dagre`. Produces a hierarchical layered
 * layout and converts dagre's center-anchored coordinates into the top-left
 * anchored coordinates the rest of this package expects.
 */
export const dagreEngine: iLayoutEngine = {
  name: 'dagre',
  async run(graph: iFlowGraph, ctx: iEngineContext): Promise<iPositions> {
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: rankDirFor(ctx.direction),
      nodesep: ctx.nodeSpacing,
      ranksep: ctx.rankSpacing,
    });
    g.setDefaultEdgeLabel(() => ({}));

    for (const node of graph.nodes) {
      g.setNode(node.id, { width: ctx.nodeWidth, height: ctx.nodeHeight });
    }
    for (const edge of graph.edges) {
      if (!g.hasNode(edge.from) || !g.hasNode(edge.to)) continue;
      g.setEdge(edge.from, edge.to);
    }

    dagre.layout(g);

    const positions: iPositions = new Map();
    for (const node of graph.nodes) {
      // Every node was `setNode`'d above, so dagre always returns a laid-out position.
      const laidOut = g.node(node.id) as { x: number; y: number };
      positions.set(node.id, { x: laidOut.x - ctx.nodeWidth / 2, y: laidOut.y - ctx.nodeHeight / 2 });
    }
    return positions;
  },
};
