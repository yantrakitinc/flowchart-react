// SETUP: IR JSON-Schema port — publishes the iFlowGraph shape (draft 2020-12) so external
// agents/tools validate a graph without importing the TypeScript types. Kept in lock-step with
// ./types.ts and mirrored to schema/flow-graph.schema.json (drift-guarded by schema.test.ts).

/** JSON Schema (draft 2020-12) for the {@link iFlowGraph} IR. */
export const FLOW_GRAPH_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://yantrakit.com/schema/flow-graph.schema.json',
  title: 'FlowGraph',
  description: 'The @yantrakit/flowchart-react intermediate representation (IR).',
  type: 'object',
  required: ['id', 'name', 'direction', 'nodes', 'edges'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
    name: { type: 'string' },
    direction: { enum: ['TD', 'BT', 'LR', 'RL'] },
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'label', 'type'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', minLength: 1 },
          label: { type: 'string' },
          type: {
            enum: ['start', 'end', 'action', 'decision', 'error', 'warning', 'link'],
          },
          description: { type: 'string' },
          data: { type: 'object' },
        },
      },
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'from', 'to', 'type'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', minLength: 1 },
          from: { type: 'string', minLength: 1 },
          to: { type: 'string', minLength: 1 },
          type: { enum: ['happy', 'warning', 'error', 'default'] },
          label: { type: 'string' },
        },
      },
    },
  },
} as const;
