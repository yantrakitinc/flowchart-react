import { describe, expect, it } from 'vitest';
import { detectPaths } from './detectPaths';
import type { iFlowGraph } from '../ir/types';

function graph(overrides: Partial<iFlowGraph> = {}): iFlowGraph {
  return { id: 'g', name: 'G', direction: 'TD', nodes: [], edges: [], ...overrides };
}

describe('detectPaths — empty graph', () => {
  it('returns empty results for a graph with no nodes', () => {
    const result = detectPaths(graph());
    expect(result).toEqual({ paths: [], startNodeIds: [], endNodeIds: [] });
  });
});

describe('detectPaths — single node', () => {
  it('treats a lone node as both start and end, producing one neutral path', () => {
    const g = graph({ nodes: [{ id: 'a', label: 'A', type: 'action' }] });
    const result = detectPaths(g);
    expect(result.startNodeIds).toEqual(['a']);
    expect(result.endNodeIds).toEqual(['a']);
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0]).toMatchObject({ type: 'neutral', nodeIds: ['a'], edgeIds: [] });
  });
});

describe('detectPaths — classification', () => {
  it('classifies a path with only default/happy edges as happy', () => {
    const g = graph({
      nodes: [
        { id: 'a', label: 'A', type: 'start' },
        { id: 'b', label: 'B', type: 'end' },
      ],
      edges: [{ id: 'e0', from: 'a', to: 'b', type: 'happy' }],
    });
    expect(detectPaths(g).paths[0].type).toBe('happy');
  });

  it('classifies a path with no semantic edges as neutral', () => {
    const g = graph({
      nodes: [
        { id: 'a', label: 'A', type: 'start' },
        { id: 'b', label: 'B', type: 'end' },
      ],
      edges: [{ id: 'e0', from: 'a', to: 'b', type: 'default' }],
    });
    expect(detectPaths(g).paths[0].type).toBe('neutral');
  });

  it('classifies error when error count >= happy count', () => {
    const g = graph({
      nodes: [
        { id: 'a', label: 'A', type: 'start' },
        { id: 'b', label: 'B', type: 'action' },
        { id: 'c', label: 'C', type: 'end' },
      ],
      edges: [
        { id: 'e0', from: 'a', to: 'b', type: 'happy' },
        { id: 'e1', from: 'b', to: 'c', type: 'error' },
      ],
    });
    expect(detectPaths(g).paths[0].type).toBe('error');
  });

  it('classifies warning when warning count exceeds both happy and error counts', () => {
    const g = graph({
      nodes: [
        { id: 'a', label: 'A', type: 'start' },
        { id: 'b', label: 'B', type: 'action' },
        { id: 'c', label: 'C', type: 'action' },
        { id: 'd', label: 'D', type: 'end' },
      ],
      edges: [
        { id: 'e0', from: 'a', to: 'b', type: 'warning' },
        { id: 'e1', from: 'b', to: 'c', type: 'warning' },
        { id: 'e2', from: 'c', to: 'd', type: 'happy' },
      ],
    });
    expect(detectPaths(g).paths[0].type).toBe('warning');
  });
});

describe('detectPaths — start/end resolution fallbacks', () => {
  it('falls back to no-incoming/no-outgoing nodes when no explicit start/end type exists', () => {
    const g = graph({
      nodes: [
        { id: 'a', label: 'A', type: 'action' },
        { id: 'b', label: 'B', type: 'action' },
      ],
      edges: [{ id: 'e0', from: 'a', to: 'b', type: 'default' }],
    });
    const result = detectPaths(g);
    expect(result.startNodeIds).toEqual(['a']);
    expect(result.endNodeIds).toEqual(['b']);
  });

  it('falls back to the first node when every node has both incoming and outgoing edges', () => {
    const g = graph({
      nodes: [
        { id: 'a', label: 'A', type: 'action' },
        { id: 'b', label: 'B', type: 'action' },
      ],
      edges: [
        { id: 'e0', from: 'a', to: 'b', type: 'default' },
        { id: 'e1', from: 'b', to: 'a', type: 'default' },
      ],
    });
    const result = detectPaths(g);
    expect(result.startNodeIds).toEqual(['a']);
    expect(result.endNodeIds).toEqual(['a']);
  });
});

describe('detectPaths — cycles, dangling edges and no-route fallback', () => {
  it('does not loop forever on a cycle and still reaches the end', () => {
    const g = graph({
      nodes: [
        { id: 'a', label: 'A', type: 'start' },
        { id: 'b', label: 'B', type: 'action' },
        { id: 'c', label: 'C', type: 'end' },
      ],
      edges: [
        { id: 'e0', from: 'a', to: 'b', type: 'default' },
        { id: 'e1', from: 'b', to: 'a', type: 'default' },
        { id: 'e2', from: 'b', to: 'c', type: 'default' },
      ],
    });
    const result = detectPaths(g);
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0].nodeIds).toEqual(['a', 'b', 'c']);
  });

  it('ignores a dangling edge (target not present as a node) without crashing', () => {
    const g = graph({
      nodes: [{ id: 'a', label: 'A', type: 'start' }],
      edges: [{ id: 'e0', from: 'a', to: 'ghost', type: 'default' }],
    });
    const result = detectPaths(g);
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0].type).toBe('neutral');
  });

  it('falls back to a single neutral path over all nodes when no route reaches an end', () => {
    const g = graph({
      nodes: [
        { id: 'a', label: 'A', type: 'start' },
        { id: 'b', label: 'B', type: 'end' },
      ],
      edges: [],
    });
    const result = detectPaths(g);
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0]).toMatchObject({ type: 'neutral', nodeIds: ['a', 'b'], edgeIds: [] });
  });
});

describe('detectPaths — guards', () => {
  it('caps the number of recorded paths at 50 on a combinatorially explosive graph', () => {
    // A "diamond stack": each layer doubles the route count. 8 layers → 2^8 = 256 routes,
    // far past MAX_PATHS, guarded to exactly 50.
    const nodes: iFlowGraph['nodes'] = [{ id: 'start', label: 'start', type: 'start' }];
    const edges: iFlowGraph['edges'] = [];
    let prevLayer = ['start'];
    for (let layer = 0; layer < 8; layer += 1) {
      const nextLayer = [`${layer}a`, `${layer}b`];
      for (const id of nextLayer) nodes.push({ id, label: id, type: 'action' });
      for (const from of prevLayer) {
        for (const to of nextLayer) {
          edges.push({ id: `e${edges.length}`, from, to, type: 'default' });
        }
      }
      prevLayer = nextLayer;
    }
    nodes.push({ id: 'end', label: 'end', type: 'end' });
    for (const from of prevLayer) {
      edges.push({ id: `e${edges.length}`, from, to: 'end', type: 'default' });
    }

    const result = detectPaths(graph({ nodes, edges }));
    expect(result.paths.length).toBeLessThanOrEqual(50);
    expect(result.paths.length).toBe(50);
  });

  it('stops enumerating remaining start nodes once MAX_PATHS is already reached', () => {
    // The first start node alone explodes past 50 routes; a second, independent start
    // node feeds a uniquely-identifiable node that must never appear in the result.
    const nodes: iFlowGraph['nodes'] = [{ id: 'start1', label: 'start1', type: 'start' }];
    const edges: iFlowGraph['edges'] = [];
    let prevLayer = ['start1'];
    for (let layer = 0; layer < 8; layer += 1) {
      const nextLayer = [`${layer}a`, `${layer}b`];
      for (const id of nextLayer) nodes.push({ id, label: id, type: 'action' });
      for (const from of prevLayer) {
        for (const to of nextLayer) {
          edges.push({ id: `e${edges.length}`, from, to, type: 'default' });
        }
      }
      prevLayer = nextLayer;
    }
    nodes.push({ id: 'end', label: 'end', type: 'end' });
    for (const from of prevLayer) {
      edges.push({ id: `e${edges.length}`, from, to: 'end', type: 'default' });
    }

    nodes.push({ id: 'start2', label: 'start2', type: 'start' }, { id: 'only-from-start2', label: 'unreached', type: 'action' });
    edges.push({ id: `e${edges.length}`, from: 'start2', to: 'only-from-start2', type: 'default' });
    edges.push({ id: `e${edges.length}`, from: 'only-from-start2', to: 'end', type: 'default' });

    const result = detectPaths(graph({ nodes, edges }));
    expect(result.paths.length).toBe(50);
    expect(result.paths.some((p) => p.nodeIds.includes('only-from-start2'))).toBe(false);
  });

  it('gives up past MAX_DEPTH on a long linear chain, falling back to the single neutral path', () => {
    const nodes: iFlowGraph['nodes'] = [];
    const edges: iFlowGraph['edges'] = [];
    const length = 105;
    for (let i = 0; i < length; i += 1) {
      nodes.push({ id: `n${i}`, label: `n${i}`, type: i === 0 ? 'start' : i === length - 1 ? 'end' : 'action' });
      if (i > 0) edges.push({ id: `e${i - 1}`, from: `n${i - 1}`, to: `n${i}`, type: 'default' });
    }
    const result = detectPaths(graph({ nodes, edges }));
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0].nodeIds).toHaveLength(length);
  });
});
