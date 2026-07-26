import { describe, it, expect } from 'vitest';
import published from '../../schema/flow-graph.schema.json';
import { FLOW_GRAPH_SCHEMA } from './schema';

describe('FLOW_GRAPH_SCHEMA', () => {
  it('matches the published schema/flow-graph.schema.json (no drift)', () => {
    expect(JSON.parse(JSON.stringify(FLOW_GRAPH_SCHEMA))).toEqual(published);
  });

  it('declares the five required top-level fields', () => {
    expect(FLOW_GRAPH_SCHEMA.required).toEqual(['id', 'name', 'direction', 'nodes', 'edges']);
  });
});
