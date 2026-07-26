import { describe, expect, it } from 'vitest';
import { layout } from './layout';
import type { iFlowGraph } from '../ir/types';
import type { iLayoutEngine, iPositions } from './types';

function graph(): iFlowGraph {
  return {
    id: 'g',
    name: 'G',
    direction: 'TD',
    nodes: [
      { id: 'a', label: 'A', type: 'start' },
      { id: 'b', label: 'B', type: 'end' },
    ],
    edges: [{ id: 'e0', from: 'a', to: 'b', type: 'default' }],
  };
}

describe('layout', () => {
  it('uses the default dagre engine and default sizing when no options are given', async () => {
    const result = await layout(graph());
    expect(result.direction).toBe('TD');
    expect(result.nodes).toHaveLength(2);
    for (const node of result.nodes) {
      expect(node.width).toBe(180);
      expect(node.height).toBe(64);
      expect(typeof node.x).toBe('number');
      expect(typeof node.y).toBe('number');
    }
    expect(result.edges).toHaveLength(1);
  });

  it('honors custom node sizing/spacing options', async () => {
    const result = await layout(graph(), { nodeWidth: 200, nodeHeight: 80, rankSpacing: 10, nodeSpacing: 10 });
    expect(result.nodes[0].width).toBe(200);
    expect(result.nodes[0].height).toBe(80);
  });

  it('uses a custom engine when provided', async () => {
    const engine: iLayoutEngine = {
      name: 'fixed',
      run: async () => {
        const positions: iPositions = new Map([
          ['a', { x: 10, y: 20 }],
          ['b', { x: 30, y: 40 }],
        ]);
        return positions;
      },
    };
    const result = await layout(graph(), { engine });
    expect(result.nodes.find((n) => n.id === 'a')).toMatchObject({ x: 10, y: 20 });
    expect(result.nodes.find((n) => n.id === 'b')).toMatchObject({ x: 30, y: 40 });
  });

  it('defaults a node position to {0,0} when the engine omits it', async () => {
    const engine: iLayoutEngine = {
      name: 'empty',
      run: async () => new Map(),
    };
    const result = await layout(graph(), { engine });
    for (const node of result.nodes) {
      expect(node.x).toBe(0);
      expect(node.y).toBe(0);
    }
  });
});
