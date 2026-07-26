import { describe, expect, it } from 'vitest';
import { dagreEngine } from './dagreEngine';
import type { iFlowGraph } from '../ir/types';
import type { iEngineContext } from './types';

const ctx: iEngineContext = { direction: 'TD', nodeWidth: 180, nodeHeight: 64, rankSpacing: 80, nodeSpacing: 48 };

function graph(direction: iFlowGraph['direction']): iFlowGraph {
  return {
    id: 'g',
    name: 'G',
    direction,
    nodes: [
      { id: 'a', label: 'A', type: 'start' },
      { id: 'b', label: 'B', type: 'action' },
      { id: 'c', label: 'C', type: 'end' },
    ],
    edges: [
      { id: 'e0', from: 'a', to: 'b', type: 'default' },
      { id: 'e1', from: 'b', to: 'c', type: 'default' },
    ],
  };
}

describe('dagreEngine', () => {
  it.each(['TD', 'BT', 'LR', 'RL'] as const)('lays out a %s graph, returning a position per node', async (direction) => {
    const g = graph(direction);
    const positions = await dagreEngine.run(g, { ...ctx, direction });
    expect(positions.size).toBe(3);
    for (const node of g.nodes) {
      const pos = positions.get(node.id);
      expect(pos).toBeDefined();
      expect(typeof pos?.x).toBe('number');
      expect(typeof pos?.y).toBe('number');
    }
  });

  it('ignores a dangling edge (endpoint not a real node)', async () => {
    const g: iFlowGraph = {
      id: 'g',
      name: 'G',
      direction: 'TD',
      nodes: [{ id: 'a', label: 'A', type: 'action' }],
      edges: [{ id: 'e0', from: 'a', to: 'ghost', type: 'default' }],
    };
    const positions = await dagreEngine.run(g, ctx);
    expect(positions.size).toBe(1);
    expect(positions.get('a')).toBeDefined();
  });

  it('has the expected engine name', () => {
    expect(dagreEngine.name).toBe('dagre');
  });
});
