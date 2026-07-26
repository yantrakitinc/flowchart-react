import { describe, it, expect } from 'vitest';
import { dagreEngine } from './dagreEngine';
import { elkEngine, loadElk } from './elkEngine';
import type { iEngineContext } from './types';
import type { iFlowGraph } from '../ir/types';

const CTX: iEngineContext = {
  direction: 'TD',
  nodeWidth: 180,
  nodeHeight: 64,
  rankSpacing: 80,
  nodeSpacing: 48,
};

/** A graph containing a dangling edge (references a node that does not exist). */
const withDangling = (direction: iFlowGraph['direction']): iFlowGraph => ({
  id: 'g',
  name: 'g',
  direction,
  nodes: [
    { id: 'a', label: 'A', type: 'start' },
    { id: 'b', label: 'B', type: 'end' },
  ],
  edges: [
    { id: 'e0', from: 'a', to: 'b', type: 'default' },
    { id: 'e1', from: 'a', to: 'ghost', type: 'default' }, // dangling — must be skipped
  ],
});

describe('dagreEngine', () => {
  it('positions nodes and skips dangling edges', async () => {
    const positions = await dagreEngine.run(withDangling('TD'), CTX);
    expect(positions.get('a')).toBeDefined();
    expect(positions.get('b')).toBeDefined();
  });
});

describe('elkEngine', () => {
  it.each(['TD', 'BT', 'LR', 'RL'] as const)('lays out for direction %s', async (direction) => {
    const positions = await elkEngine.run(withDangling(direction), { ...CTX, direction });
    expect(positions.get('a')).toBeDefined();
    expect(positions.get('b')).toBeDefined();
  });
});

describe('loadElk', () => {
  it('returns the ELK constructor from the importer', async () => {
    class FakeElk {
      layout() {
        return Promise.resolve({});
      }
    }
    const ctor = await loadElk(() => Promise.resolve({ default: FakeElk as never }));
    expect(ctor).toBe(FakeElk);
  });

  it('throws a helpful error when elkjs cannot be imported', async () => {
    await expect(
      loadElk(() => Promise.reject(new Error('not found')))
    ).rejects.toThrow(/requires the optional peer dependency 'elkjs'/);
  });
});
