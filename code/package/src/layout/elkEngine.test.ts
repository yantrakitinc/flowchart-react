import { describe, expect, it } from 'vitest';
import { elkEngine, loadElk } from './elkEngine';
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
      { id: 'b', label: 'B', type: 'end' },
    ],
    edges: [{ id: 'e0', from: 'a', to: 'b', type: 'default' }],
  };
}

describe('loadElk', () => {
  it('resolves an instance from a successful importer', async () => {
    class FakeElk {
      layout() {
        return Promise.resolve({ children: [] });
      }
    }
    const elk = await loadElk(() => Promise.resolve({ default: FakeElk }));
    expect(elk).toBeInstanceOf(FakeElk);
  });

  it('throws a clear error when the importer rejects with an Error (elkjs not installed)', async () => {
    await expect(loadElk(() => Promise.reject(new Error('module not found')))).rejects.toThrow(
      /optional peer dependency "elkjs"/
    );
  });

  it('throws a clear error when the importer rejects with a non-Error value', async () => {
    await expect(loadElk(() => Promise.reject('boom'))).rejects.toThrow(/optional peer dependency "elkjs"/);
  });

  it('loads the real elkjs package by default', async () => {
    const elk = await loadElk();
    expect(typeof elk.layout).toBe('function');
  });
});

describe('elkEngine', () => {
  it.each(['TD', 'BT', 'LR', 'RL'] as const)('lays out a %s graph, returning a position per node', async (direction) => {
    const g = graph(direction);
    const positions = await elkEngine.run(g, { ...ctx, direction });
    expect(positions.size).toBe(2);
    for (const node of g.nodes) {
      const pos = positions.get(node.id);
      expect(pos).toBeDefined();
      expect(typeof pos?.x).toBe('number');
      expect(typeof pos?.y).toBe('number');
    }
  });

  it('filters out a dangling edge before handing the graph to elkjs', async () => {
    const g: iFlowGraph = {
      id: 'g',
      name: 'G',
      direction: 'TD',
      nodes: [{ id: 'a', label: 'A', type: 'action' }],
      edges: [{ id: 'e0', from: 'a', to: 'ghost', type: 'default' }],
    };
    const positions = await elkEngine.run(g, ctx);
    expect(positions.size).toBe(1);
  });

  it('has the expected engine name', () => {
    expect(elkEngine.name).toBe('elk');
  });
});
