import { describe, it, expect } from 'vitest';
import { parseFlowchart } from './parseFlowchart';
import { serializeFlowchart } from './serializeFlowchart';
import { FlowchartParseError } from './errors';

describe('parseFlowchart — header', () => {
  it('parses the direction from the header', () => {
    expect(parseFlowchart('flowchart LR\n  a --> b').direction).toBe('LR');
  });
  it('accepts "graph" as a header keyword', () => {
    expect(parseFlowchart('graph TD\n  a --> b').direction).toBe('TD');
  });
  it('normalizes TB to TD', () => {
    expect(parseFlowchart('flowchart TB\n  a --> b').direction).toBe('TD');
  });
  it('parses BT and RL directions', () => {
    expect(parseFlowchart('flowchart BT\n  a --> b').direction).toBe('BT');
    expect(parseFlowchart('flowchart RL\n  a --> b').direction).toBe('RL');
  });
  it('throws when the header is missing', () => {
    expect(() => parseFlowchart('a --> b')).toThrow(FlowchartParseError);
  });
  it('throws on an unknown direction', () => {
    expect(() => parseFlowchart('flowchart XY\n a --> b')).toThrow(/unknown direction/);
  });
  it('accepts a direction supplied via options without a header', () => {
    const g = parseFlowchart('a --> b', { direction: 'RL' });
    expect(g.direction).toBe('RL');
    expect(g.nodes).toHaveLength(2);
  });
  it('uses id/name options', () => {
    const g = parseFlowchart('flowchart TD\n a --> b', { id: 'x', name: 'X' });
    expect(g.id).toBe('x');
    expect(g.name).toBe('X');
  });
});

describe('parseFlowchart — node shapes', () => {
  it('maps [] to action', () => {
    const g = parseFlowchart('flowchart TD\n  mid --> x[Do thing]\n  x --> done');
    expect(g.nodes.find((n) => n.id === 'x')?.type).toBe('action');
    expect(g.nodes.find((n) => n.id === 'x')?.label).toBe('Do thing');
  });
  it('maps {} to decision', () => {
    const g = parseFlowchart('flowchart TD\n  s --> d{OK?}\n  d --> e');
    expect(g.nodes.find((n) => n.id === 'd')?.type).toBe('decision');
  });
  it('resolves ([ ]) stadium by position', () => {
    const g = parseFlowchart('flowchart TD\n  s([Start]) --> mid\n  mid --> e([End])');
    expect(g.nodes.find((n) => n.id === 's')?.type).toBe('start');
    expect(g.nodes.find((n) => n.id === 'e')?.type).toBe('end');
  });
  it('treats a stadium with both in and out edges as action', () => {
    const g = parseFlowchart('flowchart TD\n  s --> m([Mid])\n  m --> e');
    expect(g.nodes.find((n) => n.id === 'm')?.type).toBe('action');
  });
});

describe('parseFlowchart — node classes', () => {
  it('honors an explicit :::class over shape and position', () => {
    const g = parseFlowchart('flowchart TD\n  s --> fail[Boom]:::error\n  fail --> done');
    expect(g.nodes.find((n) => n.id === 'fail')?.type).toBe('error');
  });
  it('rejects an unknown node class', () => {
    expect(() => parseFlowchart('flowchart TD\n  a:::nope --> b')).toThrow(/unknown node class/);
  });
  it('throws on a malformed node class marker with no name', () => {
    expect(() => parseFlowchart('flowchart TD\n  a::: --> b')).toThrow(/malformed class on node/);
  });
});

describe('parseFlowchart — start/end inference', () => {
  it('promotes the entry node to start and terminal node to end', () => {
    const g = parseFlowchart('flowchart TD\n  a --> b\n  b --> c');
    expect(g.nodes.find((n) => n.id === 'a')?.type).toBe('start');
    expect(g.nodes.find((n) => n.id === 'c')?.type).toBe('end');
    expect(g.nodes.find((n) => n.id === 'b')?.type).toBe('action');
  });
  it('falls back to the first node as start when every node has an incoming edge (cycle)', () => {
    const g = parseFlowchart('flowchart TD\n  a --> b\n  b --> a');
    expect(g.nodes.some((n) => n.type === 'start')).toBe(true);
  });
  it('does not force a start when the first node is explicitly typed in a cycle', () => {
    const g = parseFlowchart('flowchart TD\n  a:::action --> b\n  b --> a');
    expect(g.nodes.find((n) => n.id === 'a')?.type).toBe('action');
    expect(g.nodes.some((n) => n.type === 'start')).toBe(false);
  });
});

describe('parseFlowchart — edges', () => {
  it('maps glyphs to edge types', () => {
    const g = parseFlowchart('flowchart TD\n  a --> b\n  b -.-> c\n  c ==> d');
    expect(g.edges.map((e) => e.type)).toEqual(['default', 'warning', 'error']);
  });
  it('parses an edge label', () => {
    expect(parseFlowchart('flowchart TD\n  a -->|yes| b').edges[0].label).toBe('yes');
  });
  it('honors an explicit edge class over the glyph', () => {
    const g = parseFlowchart('flowchart TD\n  a -->|go|:::happy b');
    expect(g.edges[0].type).toBe('happy');
    expect(g.edges[0].label).toBe('go');
  });
  it('rejects an unknown edge class', () => {
    expect(() => parseFlowchart('flowchart TD\n a -->:::nope b')).toThrow(/unknown edge class/);
  });
  it('throws on a malformed edge class marker with no name', () => {
    expect(() => parseFlowchart('flowchart TD\n a -->::: b')).toThrow(/malformed edge class/);
  });
  it('adopts a label supplied on a later mention of a node', () => {
    const g = parseFlowchart('flowchart TD\n  a --> b\n  b[Labeled] --> c');
    expect(g.nodes.find((n) => n.id === 'b')?.label).toBe('Labeled');
  });
  it('parses a chain A --> B --> C into two edges', () => {
    const g = parseFlowchart('flowchart TD\n  a --> b --> c');
    expect(g.edges.map((e) => [e.from, e.to])).toEqual([
      ['a', 'b'],
      ['b', 'c'],
    ]);
  });
  it('tokenizes links without surrounding spaces', () => {
    expect(parseFlowchart('flowchart TD\n  a-->b').edges[0]).toMatchObject({
      from: 'a',
      to: 'b',
      type: 'default',
    });
  });
  it('gives every edge a unique id', () => {
    const g = parseFlowchart('flowchart TD\n  a --> b\n  b --> c');
    const ids = g.edges.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('parseFlowchart — comments, whitespace & errors', () => {
  it('ignores %% comment lines and inline comments', () => {
    const g = parseFlowchart('flowchart TD\n  %% a comment\n  a --> b %% trailing');
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['a', 'b']);
  });
  it('ignores blank lines', () => {
    expect(parseFlowchart('flowchart TD\n\n\n  a --> b\n\n').edges).toHaveLength(1);
  });
  it('throws on an unclosed shape bracket', () => {
    expect(() => parseFlowchart('flowchart TD\n  a[Start --> b')).toThrow(FlowchartParseError);
  });
  it('throws on an unclosed decision/stadium bracket', () => {
    expect(() => parseFlowchart('flowchart TD\n  a{Start --> b')).toThrow(/unclosed/);
    expect(() => parseFlowchart('flowchart TD\n  a([Start --> b')).toThrow(/unclosed/);
  });
  it('throws on an unclosed edge label', () => {
    expect(() => parseFlowchart('flowchart TD\n  a -->|yes b')).toThrow(/unclosed edge label/);
  });
  it('throws when a statement does not start with a node id', () => {
    expect(() => parseFlowchart('flowchart TD\n  --> b')).toThrow(/expected a node id/);
  });
  it('throws when an edge glyph is expected but missing', () => {
    expect(() => parseFlowchart('flowchart TD\n  a b')).toThrow(/expected an edge/);
  });
  it('throws on an empty diagram', () => {
    expect(() => parseFlowchart('flowchart TD\n')).toThrow(/no nodes/);
  });
  it('throws "missing flow direction" when the input is only comments/blanks', () => {
    expect(() => parseFlowchart('\n%% just a comment\n\n')).toThrow(/missing flow direction/);
  });
  it('upgrades a bare node to an explicit class on redeclaration', () => {
    const g = parseFlowchart('flowchart TD\n  a --> b\n  b:::error --> c');
    expect(g.nodes.find((n) => n.id === 'b')?.type).toBe('error');
  });
  it('carries a 1-based line number', () => {
    try {
      parseFlowchart('flowchart TD\n  a --> b\n  c :: broken');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(FlowchartParseError);
      expect((err as FlowchartParseError).line).toBe(3);
    }
  });
});

describe('serializeFlowchart — round trip', () => {
  const semantic = (t: string) => {
    const g = parseFlowchart(t);
    return {
      direction: g.direction,
      nodes: g.nodes,
      edges: g.edges.map(({ id: _id, ...rest }) => rest),
    };
  };

  it('parse → serialize → parse is stable across all shapes/glyphs', () => {
    const src = [
      'flowchart TD',
      '  s([Start]) --> check{Payment OK?}',
      '  check -->|yes| ship[Ship order]',
      '  check ==>|no| fail[Show error]:::error',
      '  ship --> done([Done])',
      '  fail -.-> done',
    ].join('\n');
    expect(semantic(serializeFlowchart(parseFlowchart(src)))).toEqual(semantic(src));
  });

  it('preserves all node types + an edge label through a round trip', () => {
    const g = parseFlowchart('flowchart LR\n  a([A]) -->|go| b{B}\n  b --> c[C]:::warning\n  c --> d([D])');
    expect(parseFlowchart(serializeFlowchart(g)).nodes).toEqual(g.nodes);
  });
});
