import { describe, expect, it } from 'vitest';
import { FLOW_GRAPH_SCHEMA } from './schema';
import schemaJson from '../../schema/flow-graph.schema.json';

describe('FLOW_GRAPH_SCHEMA', () => {
  it('stays byte-identical to the published schema/flow-graph.schema.json file', () => {
    expect(FLOW_GRAPH_SCHEMA).toEqual(schemaJson);
  });
});
