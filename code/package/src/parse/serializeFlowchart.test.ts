import { describe, expect, it } from 'vitest';
import { serializeFlowchart } from './serializeFlowchart';
import type { iFlowGraph } from '../ir/types';

describe('serializeFlowchart', () => {
  it('emits a header line with the graph direction', () => {
    const graph: iFlowGraph = { id: 'g', name: 'G', direction: 'LR', nodes: [], edges: [] };
    expect(serializeFlowchart(graph)).toBe('flowchart LR');
  });

  it('emits every node with its explicit shape + class', () => {
    const graph: iFlowGraph = {
      id: 'g',
      name: 'G',
      direction: 'TD',
      nodes: [
        { id: 'S', label: 'Start', type: 'start' },
        { id: 'A', label: 'Do', type: 'action' },
        { id: 'D', label: 'Check', type: 'decision' },
        { id: 'W', label: 'Warn', type: 'warning' },
        { id: 'X', label: 'Err', type: 'error' },
        { id: 'L', label: 'Link', type: 'link' },
        { id: 'E', label: 'End', type: 'end' },
      ],
      edges: [],
    };
    const lines = serializeFlowchart(graph).split('\n');
    expect(lines).toContain('S([Start]):::start');
    expect(lines).toContain('A[Do]:::action');
    expect(lines).toContain('D{Check}:::decision');
    expect(lines).toContain('W[Warn]:::warning');
    expect(lines).toContain('X[Err]:::error');
    expect(lines).toContain('L[Link]:::link');
    expect(lines).toContain('E([End]):::end');
  });

  it('emits edges with the glyph matching type, an optional label, and drops node.data', () => {
    const graph: iFlowGraph = {
      id: 'g',
      name: 'G',
      direction: 'TD',
      nodes: [
        { id: 'A', label: 'A', type: 'action', data: { secret: true } },
        { id: 'B', label: 'B', type: 'action' },
      ],
      edges: [
        { id: 'e0', from: 'A', to: 'B', type: 'happy', label: 'ok' },
        { id: 'e1', from: 'A', to: 'B', type: 'warning' },
        { id: 'e2', from: 'A', to: 'B', type: 'error' },
        { id: 'e3', from: 'A', to: 'B', type: 'default' },
      ],
    };
    const text = serializeFlowchart(graph);
    expect(text).toContain('A -->|ok|:::happy B');
    expect(text).toContain('A -.->:::warning B');
    expect(text).toContain('A ==>:::error B');
    expect(text).toContain('A -->:::default B');
    expect(text).not.toContain('secret');
  });
});
