import { describe, it, expect } from 'vitest';
import { detectPaths } from './detectPaths';
import { parseFlowchart } from '../parse/parseFlowchart';
import type { iFlowGraph } from '../ir/types';

describe('detectPaths', () => {
  it('finds the single path in a linear graph', () => {
    const { paths } = detectPaths(parseFlowchart('flowchart TD\n  a --> b --> c'));
    expect(paths).toHaveLength(1);
    expect(paths[0].nodeIds).toEqual(['a', 'b', 'c']);
  });

  it('enumerates both branches of a decision', () => {
    const { paths } = detectPaths(
      parseFlowchart(
        'flowchart TD\n  s --> d{OK?}\n  d -->|yes| ok\n  d ==>|no| bad\n  ok --> e([End])\n  bad --> e'
      )
    );
    expect(paths.length).toBe(2);
  });

  it('classifies an all-error path as error', () => {
    const { paths } = detectPaths(parseFlowchart('flowchart TD\n  s ==> bad ==> e([End])'));
    expect(paths[0].type).toBe('error');
  });

  it('classifies a happy-edge path as happy', () => {
    const { paths } = detectPaths(
      parseFlowchart('flowchart TD\n  s -->|go|:::happy ok -->|go|:::happy e([End])')
    );
    expect(paths[0].type).toBe('happy');
  });

  it('classifies a warning-dominant path as warning', () => {
    const { paths } = detectPaths(parseFlowchart('flowchart TD\n  s -.-> m -.-> e([End])'));
    expect(paths[0].type).toBe('warning');
  });

  it('classifies an all-default path as neutral', () => {
    const { paths } = detectPaths(parseFlowchart('flowchart TD\n  a --> b --> c'));
    expect(paths[0].type).toBe('neutral');
  });

  it('reports start and end node ids', () => {
    const { startNodeIds, endNodeIds } = detectPaths(
      parseFlowchart('flowchart TD\n  s([Start]) --> e([End])')
    );
    expect(startNodeIds).toContain('s');
    expect(endNodeIds).toContain('e');
  });

  it('does not loop forever on a cycle and still returns a bounded path', () => {
    const { paths } = detectPaths(
      parseFlowchart('flowchart TD\n  a --> b\n  b --> a\n  b --> c([End])')
    );
    expect(paths.length).toBeGreaterThanOrEqual(1);
    expect(paths.every((p) => p.nodeIds.length <= 4)).toBe(true);
  });

  it('caps enumeration at the MAX_PATHS guard for a highly-branching graph', () => {
    // 6 chained diamonds → 2^6 = 64 distinct start→end paths, above the 50 cap.
    const nodes: iFlowGraph['nodes'] = [{ id: 's', label: 'S', type: 'start' }];
    const edges: iFlowGraph['edges'] = [];
    let prev = 's';
    let e = 0;
    for (let d = 0; d < 6; d++) {
      const up = `u${d}`;
      const down = `l${d}`;
      const join = `j${d}`;
      nodes.push({ id: up, label: up, type: 'action' });
      nodes.push({ id: down, label: down, type: 'action' });
      nodes.push({ id: join, label: join, type: d === 5 ? 'end' : 'action' });
      edges.push({ id: `e${e++}`, from: prev, to: up, type: 'default' });
      edges.push({ id: `e${e++}`, from: prev, to: down, type: 'default' });
      edges.push({ id: `e${e++}`, from: up, to: join, type: 'default' });
      edges.push({ id: `e${e++}`, from: down, to: join, type: 'default' });
      prev = join;
    }
    const { paths } = detectPaths({ id: 'g', name: 'g', direction: 'TD', nodes, edges });
    expect(paths.length).toBe(50);
  });

  it('returns an all-node fallback for a pure cycle with no resolvable start/end', () => {
    const graph: iFlowGraph = {
      id: 'g',
      name: 'g',
      direction: 'TD',
      nodes: [
        { id: 'a', label: 'A', type: 'action' },
        { id: 'b', label: 'B', type: 'action' },
      ],
      edges: [
        { id: 'e0', from: 'a', to: 'b', type: 'default' },
        { id: 'e1', from: 'b', to: 'a', type: 'default' },
      ],
    };
    const { paths, endNodeIds } = detectPaths(graph);
    expect(endNodeIds).toHaveLength(0);
    expect(paths).toHaveLength(1);
    expect(paths[0].nodeIds).toEqual(['a', 'b']);
  });

  it('classifies a single node that is both start and end as neutral (no edges)', () => {
    const graph: iFlowGraph = {
      id: 'g',
      name: 'g',
      direction: 'TD',
      nodes: [{ id: 'solo', label: 'Solo', type: 'action' }],
      edges: [],
    };
    const { paths } = detectPaths(graph);
    expect(paths).toHaveLength(1);
    expect(paths[0].type).toBe('neutral');
    expect(paths[0].edgeIds).toEqual([]);
  });

  it('handles an edge pointing at an undeclared node without crashing', () => {
    const graph: iFlowGraph = {
      id: 'g',
      name: 'g',
      direction: 'TD',
      nodes: [
        { id: 's', label: 'S', type: 'start' },
        { id: 'e', label: 'E', type: 'end' },
      ],
      edges: [
        { id: 'e0', from: 's', to: 'ghost', type: 'default' }, // ghost is not a node
        { id: 'e1', from: 's', to: 'e', type: 'default' },
      ],
    };
    const { paths } = detectPaths(graph);
    expect(paths.some((p) => p.nodeIds.join() === 's,e')).toBe(true);
  });

  it('returns a neutral fallback path when there is no start→end route', () => {
    const graph: iFlowGraph = {
      id: 'g',
      name: 'g',
      direction: 'TD',
      nodes: [
        { id: 'a', label: 'A', type: 'action' },
        { id: 'b', label: 'B', type: 'action' },
      ],
      edges: [{ id: 'e0', from: 'b', to: 'a', type: 'default' }],
    };
    const { paths } = detectPaths(graph);
    expect(paths).toHaveLength(1);
    expect(paths[0].type).toBe('neutral');
  });
});
