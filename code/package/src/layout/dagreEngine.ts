/**
 * Default layout engine, backed by dagre. Synchronous under the hood; wrapped in a
 * resolved promise to satisfy {@link iLayoutEngine}. dagre reports node centers, so we
 * convert to top-left coordinates for the renderer.
 */
import dagre from 'dagre';
import { iDirection, iFlowGraph } from '../ir/types';
import { iEngineContext, iLayoutEngine, iPositions } from './types';

/** Map our direction to dagre's rankdir. */
function rankdir(direction: iDirection): string {
  switch (direction) {
    case 'TD':
      return 'TB';
    case 'BT':
      return 'BT';
    case 'LR':
      return 'LR';
    case 'RL':
      return 'RL';
  }
}

/** dagre-backed layout strategy (the default). */
export const dagreEngine: iLayoutEngine = {
  name: 'dagre',
  run(graph: iFlowGraph, ctx: iEngineContext): Promise<iPositions> {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: rankdir(ctx.direction), ranksep: ctx.rankSpacing, nodesep: ctx.nodeSpacing });
    g.setDefaultEdgeLabel(() => ({}));

    for (const node of graph.nodes) {
      g.setNode(node.id, { width: ctx.nodeWidth, height: ctx.nodeHeight });
    }
    for (const edge of graph.edges) {
      if (graph.nodes.some((n) => n.id === edge.from) && graph.nodes.some((n) => n.id === edge.to)) {
        g.setEdge(edge.from, edge.to);
      }
    }

    dagre.layout(g);

    const positions: iPositions = new Map();
    for (const node of graph.nodes) {
      // Every node is setNode'd above, so dagre always returns a laid-out position.
      const laid = g.node(node.id) as { x: number; y: number };
      positions.set(node.id, {
        x: laid.x - ctx.nodeWidth / 2,
        y: laid.y - ctx.nodeHeight / 2,
      });
    }
    return Promise.resolve(positions);
  },
};
