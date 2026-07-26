import { describe, expect, it } from 'vitest';
import { parseFlowchart } from './parseFlowchart';
import { serializeFlowchart } from './serializeFlowchart';
import { FlowchartParseError } from './errors';

describe('parseFlowchart — header + direction', () => {
  it('parses a TD header', () => {
    const graph = parseFlowchart('flowchart TD\nA --> B');
    expect(graph.direction).toBe('TD');
  });

  it('normalizes TB to TD', () => {
    const graph = parseFlowchart('flowchart TB\nA --> B');
    expect(graph.direction).toBe('TD');
  });

  it('accepts BT, LR and RL directions and the "graph" keyword', () => {
    expect(parseFlowchart('graph BT\nA --> B').direction).toBe('BT');
    expect(parseFlowchart('flowchart LR\nA --> B').direction).toBe('LR');
    expect(parseFlowchart('flowchart RL\nA --> B').direction).toBe('RL');
  });

  it('lowercases direction tokens are accepted', () => {
    expect(parseFlowchart('flowchart td\nA --> B').direction).toBe('TD');
  });

  it('throws on an unknown direction', () => {
    expect(() => parseFlowchart('flowchart XX\nA --> B')).toThrowError(FlowchartParseError);
    try {
      parseFlowchart('flowchart XX\nA --> B');
    } catch (err) {
      expect(err).toBeInstanceOf(FlowchartParseError);
      expect((err as FlowchartParseError).line).toBe(1);
    }
  });

  it('throws "missing direction" when the header has no direction token', () => {
    expect(() => parseFlowchart('flowchart\nA --> B')).toThrowError(/missing direction/);
  });

  it('throws "missing header" when there is no header and no options.direction', () => {
    expect(() => parseFlowchart('A --> B')).toThrowError(/missing header/);
  });

  it('uses options.direction when no header line is present', () => {
    const graph = parseFlowchart('A --> B', { direction: 'LR' });
    expect(graph.direction).toBe('LR');
  });

  it('prefers an explicit header over options.direction when both are given', () => {
    const graph = parseFlowchart('flowchart RL\nA --> B', { direction: 'LR' });
    expect(graph.direction).toBe('RL');
  });

  it('assigns id/name from options, defaulting otherwise', () => {
    const withDefaults = parseFlowchart('flowchart TD\nA --> B');
    expect(withDefaults.id).toBe('flowchart');
    expect(withDefaults.name).toBe('Flowchart');
    const withOptions = parseFlowchart('flowchart TD\nA --> B', { id: 'g1', name: 'My Graph' });
    expect(withOptions.id).toBe('g1');
    expect(withOptions.name).toBe('My Graph');
  });
});

describe('parseFlowchart — shapes', () => {
  it('parses action, decision and stadium shapes with labels', () => {
    const graph = parseFlowchart(
      'flowchart TD\nS([Start]) --> A[Do thing] --> D{Check?} --> E([End])'
    );
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    expect(byId.get('S')?.type).toBe('start');
    expect(byId.get('S')?.label).toBe('Start');
    expect(byId.get('A')?.type).toBe('action');
    expect(byId.get('A')?.label).toBe('Do thing');
    expect(byId.get('D')?.type).toBe('decision');
    expect(byId.get('D')?.label).toBe('Check?');
    expect(byId.get('E')?.type).toBe('end');
  });

  it('defaults a bare node id (no shape) label to its id', () => {
    const graph = parseFlowchart('flowchart TD\nA --> B');
    expect(graph.nodes.find((n) => n.id === 'A')?.label).toBe('A');
  });

  it('updates label/shape when a node is redeclared later with a shape', () => {
    // A sits mid-chain (incoming from X, outgoing to B) so it is never a start/end
    // candidate — isolating the label/shape update from the start/end ensure-pass.
    const graph = parseFlowchart('flowchart TD\nX --> A --> B\nA[Now Labeled] --> C');
    expect(graph.nodes.find((n) => n.id === 'A')?.label).toBe('Now Labeled');
    expect(graph.nodes.find((n) => n.id === 'A')?.type).toBe('action');
  });
});

describe('parseFlowchart — explicit classes', () => {
  it('lets an explicit node class override shape/position resolution', () => {
    const graph = parseFlowchart('flowchart TD\nA[Do thing]:::warning --> B');
    expect(graph.nodes.find((n) => n.id === 'A')?.type).toBe('warning');
  });

  it('throws on an unknown node class', () => {
    expect(() => parseFlowchart('flowchart TD\nA:::bogus --> B')).toThrowError(/unknown node class/);
  });

  it('throws on a malformed node class (no identifier after :::)', () => {
    expect(() => parseFlowchart('flowchart TD\nA::: --> B')).toThrowError(/malformed/);
  });

  it('lets an explicit edge class override the glyph-derived type', () => {
    const graph = parseFlowchart('flowchart TD\nA -->:::happy B');
    expect(graph.edges[0].type).toBe('happy');
  });

  it('throws on an unknown edge class', () => {
    expect(() => parseFlowchart('flowchart TD\nA -->:::bogus B')).toThrowError(/unknown edge class/);
  });

  it('throws on a malformed edge class', () => {
    expect(() => parseFlowchart('flowchart TD\nA -->::: B')).toThrowError(/malformed/);
  });
});

describe('parseFlowchart — edges', () => {
  it('parses default, warning and error glyphs', () => {
    const graph = parseFlowchart('flowchart TD\nA --> B\nB -.-> C\nC ==> D');
    expect(graph.edges.map((e) => e.type)).toEqual(['default', 'warning', 'error']);
  });

  it('parses an edge label', () => {
    const graph = parseFlowchart('flowchart TD\nA -->|yes| B');
    expect(graph.edges[0].label).toBe('yes');
  });

  it('parses a chain of edges with generated ids', () => {
    const graph = parseFlowchart('flowchart TD\nA --> B --> C');
    expect(graph.edges.map((e) => e.id)).toEqual(['e0', 'e1']);
    expect(graph.edges[0]).toMatchObject({ from: 'A', to: 'B' });
    expect(graph.edges[1]).toMatchObject({ from: 'B', to: 'C' });
  });

  it('supports a lone node declaration with no edges', () => {
    const graph = parseFlowchart('flowchart TD\nA[Solo]');
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(0);
  });
});

describe('parseFlowchart — comments', () => {
  it('strips %% comments to end of line, including whole-line and trailing comments', () => {
    const graph = parseFlowchart(['flowchart TD', '%% a full-line comment', 'A --> B %% trailing'].join('\n'));
    expect(graph.nodes.map((n) => n.id)).toEqual(['A', 'B']);
  });
});

describe('parseFlowchart — malformed input errors', () => {
  it('throws expected-node-id when a line does not start with a node id', () => {
    expect(() => parseFlowchart('flowchart TD\n--> B')).toThrowError(/expected a node id/);
  });

  it('throws expected-edge-glyph on an unrecognized connector', () => {
    expect(() => parseFlowchart('flowchart TD\nA -> B')).toThrowError(/expected an edge glyph/);
  });

  it('throws unclosed bracket for "["', () => {
    expect(() => parseFlowchart('flowchart TD\nA[Oops --> B')).toThrowError(/unclosed bracket/);
  });

  it('throws unclosed brace for "{"', () => {
    expect(() => parseFlowchart('flowchart TD\nA{Oops --> B')).toThrowError(/unclosed brace/);
  });

  it('throws unclosed stadium bracket for "(["', () => {
    expect(() => parseFlowchart('flowchart TD\nA([Oops --> B')).toThrowError(/unclosed stadium/);
  });

  it('throws unclosed edge label for "|"', () => {
    expect(() => parseFlowchart('flowchart TD\nA -->|oops B')).toThrowError(/unclosed edge label/);
  });

  it('throws empty diagram for blank/comment-only input', () => {
    expect(() => parseFlowchart('   \n%% only a comment\n')).toThrowError(/empty diagram/);
  });

  it('throws empty diagram when the header is present but no statements follow', () => {
    expect(() => parseFlowchart('flowchart TD')).toThrowError(/empty diagram/);
  });
});

describe('parseFlowchart — start/end promotion', () => {
  it('promotes every entry action node to start when none is positionally resolved', () => {
    // A and C are both bracket-shaped ("action", never position-resolved) with no
    // incoming edges — the ensure-pass must promote both, not just the first.
    const graph = parseFlowchart('flowchart TD\nA[A] --> M[M]\nC[C] --> M');
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    expect(byId.get('A')?.type).toBe('start');
    expect(byId.get('C')?.type).toBe('start');
    expect(byId.get('M')?.type).toBe('end');
  });

  it('falls back to the first non-explicit node when no entry action node exists', () => {
    // Every node in this 2-cycle has an incoming edge, so there is no "entry action".
    const graph = parseFlowchart('flowchart TD\nA[A] --> B[B] --> A');
    expect(graph.nodes.find((n) => n.id === 'A')?.type).toBe('start');
  });

  it('promotes every terminal action node to end', () => {
    const graph = parseFlowchart('flowchart TD\nS([S]) --> A[A]\nS --> B[B]');
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    expect(byId.get('A')?.type).toBe('end');
    expect(byId.get('B')?.type).toBe('end');
  });

  it('resolves bare (shapeless) ids by position, like stadium nodes', () => {
    const graph = parseFlowchart('flowchart TD\nA --> B --> C');
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    expect(byId.get('A')?.type).toBe('start');
    expect(byId.get('B')?.type).toBe('action');
    expect(byId.get('C')?.type).toBe('end');
  });

  it('leaves no start node when every node is explicitly classed and none can be promoted', () => {
    // Both nodes are explicitly ":::action" in a 2-cycle: neither is an "entry action"
    // (both have incoming edges) and neither is "non-explicit" — so nothing is promoted.
    const graph = parseFlowchart('flowchart TD\nA:::action --> B:::action --> A');
    expect(graph.nodes.every((n) => n.type !== 'start')).toBe(true);
  });
});

describe('parseFlowchart / serializeFlowchart — round trip', () => {
  it('round-trips node/edge structure, types and labels through serialize + parse', () => {
    const original = parseFlowchart(
      [
        'flowchart LR',
        'S([Start]) --> A[Do thing]',
        'A -->|yes| D{Check?}',
        'D -.->|maybe| W[Warn]:::warning',
        'D ==>|no| F[Fail]:::error',
        'W --> E([End])',
        'F --> E',
      ].join('\n')
    );

    const text = serializeFlowchart(original);
    const roundTripped = parseFlowchart(text);

    expect(roundTripped.direction).toBe(original.direction);
    expect(roundTripped.nodes.map((n) => ({ id: n.id, label: n.label, type: n.type }))).toEqual(
      original.nodes.map((n) => ({ id: n.id, label: n.label, type: n.type }))
    );
    expect(roundTripped.edges.map((e) => ({ from: e.from, to: e.to, type: e.type, label: e.label }))).toEqual(
      original.edges.map((e) => ({ from: e.from, to: e.to, type: e.type, label: e.label }))
    );
  });
});
