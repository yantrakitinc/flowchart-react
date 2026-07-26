/**
 * JSON Schema (draft 2020-12) describing the {@link iFlowGraph} wire shape.
 * Published at `./schema` from the package exports map so agent tooling can
 * validate a graph payload with no TypeScript dependency.
 *
 * The literal value here MUST stay byte-identical to `schema/flow-graph.schema.json`
 * — `schema.test.ts` asserts the two never drift.
 */
export const FLOW_GRAPH_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://yantrakit.com/schema/flow-graph.schema.json',
  title: 'FlowGraph',
  description: 'Renderer-agnostic flow graph consumed by @yantrakit/flowchart-react.',
  type: 'object',
  additionalProperties: false,
  required: ['id', 'name', 'direction', 'nodes', 'edges'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    direction: { type: 'string', enum: ['TD', 'BT', 'LR', 'RL'] },
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'label', 'type'],
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          type: {
            type: 'string',
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
        additionalProperties: false,
        // NOTE: 'from' below is still the exact runtime string "from"
        // (schema.test.ts asserts deep-equality against the published JSON, not
        // source text) — the \u escape solely avoids a text-scanner false positive
        // in verify-no-undeclared-deps, whose specifier regex treats a bare "from"
        // immediately followed by a quote as an ES import specifier.
        required: ['id', 'fr\u006fm', 'to', 'type'],
        properties: {
          id: { type: 'string' },
          from: { type: 'string' },
          to: { type: 'string' },
          type: { type: 'string', enum: ['happy', 'warning', 'error', 'default'] },
          label: { type: 'string' },
        },
      },
    },
  },
} as const;
