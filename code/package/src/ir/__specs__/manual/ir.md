# ir

> Copy-paste this whole file to an agent with a Node.js shell in this repo's
> `code/package/` folder. It runs the steps unattended against the BUILT
> package (or `src/` directly via `tsx`/`vitest`), then prints the results.
> This is a pure-library module (`invocation.type: internal`) — there is no
> HTTP server and no `/api/v1/manual-results/<flow>` route in this repo, so
> the "Report" step below prints the results rather than POSTing them (the
> POST surface in MANUAL_FLOWS.md presumes an app with a running server;
> this repo ships an npm package + Storybook only).

## Target
local — this repo's `code/package/` folder; run steps with `npx tsx -e "<script>"` (or an equivalent one-off Node/TS runner) importing directly from `./src/ir`

## Preconditions
- none — pure, side-effect-free module; no auth, no seed data, no running peer service required

## Steps
1. Import `NODE_TYPES`, `isNodeType` from `./src/ir` and call `isNodeType(t)` for every `t` in `NODE_TYPES` → expected: every call returns `true`
2. ADVERSARIAL — abuse input: call `isNodeType('not-a-real-type')` → expected: `false`, no throw
3. ADVERSARIAL — abuse input: call `isNodeType(123)`, `isNodeType(null)`, `isNodeType(undefined)`, `isNodeType({})` → expected: `false` for all four, no throw, no coercion
4. Repeat steps 1-3 for `EDGE_TYPES` / `isEdgeType` and `DIRECTIONS` / `isDirection` → expected: same pass/fail pattern (all declared members `true`; unknown string, non-string, `null`, `undefined`, object all `false`, no throw)
5. Import `FLOW_GRAPH_SCHEMA` from `./src/ir` and `schema/flow-graph.schema.json` from the repo root; deep-compare the two with `JSON.stringify` (or `assert.deepStrictEqual`) → expected: byte-identical, confirming the exported TS constant never drifts from the published JSON file
6. ADVERSARIAL — abuse input against the schema contract: construct an `iFlowGraph`-shaped object that adds an undeclared top-level property (e.g. `{ id: 'g1', name: 'n', direction: 'TD', nodes: [], edges: [], extra: true }`) and run it through any JSON Schema validator (e.g. ajv) configured with `FLOW_GRAPH_SCHEMA` → expected: validation FAILS on the `extra` property (schema declares `additionalProperties: false` at the graph, node, and edge levels)
7. ADVERSARIAL — abuse input: construct a node object with `type: 'not-a-real-type'` and validate it against `FLOW_GRAPH_SCHEMA` → expected: validation FAILS (the node `type` enum rejects unknown values)

## Assertions
- MUST hold: every declared `NODE_TYPES` / `EDGE_TYPES` / `DIRECTIONS` member round-trips `true` through its guard; `FLOW_GRAPH_SCHEMA` is byte-identical to `schema/flow-graph.schema.json`
- MUST NOT happen: any guard throws on a non-string/`null`/`undefined`/object input; any guard returns `true` for an undeclared string; a schema-validated payload with an undeclared property or an out-of-enum `type`/`direction` value passes validation

## Report
This repo has no `/api/v1/manual-results/<flow>` route (pure npm-package repo, no server) — print the full step-by-step results (step number, what you ran, observed return value, pass/fail) directly in your response instead of POSTing them.
