# `isNodeType` flow

The fenced ```yaml block below is the machine source of truth — the loader reads
it; the prose sections are for the human/agent reader.

## Purpose

Runtime type guard narrowing an `unknown` value to `iNodeType` — true iff the
value is a string that is a member of the closed `NODE_TYPES` enumeration
(`start` / `end` / `action` / `decision` / `error` / `warning` / `link`). Used
by `src/parse/parseFlowchart.ts` to validate a user- or LLM-authored node
class before accepting it into the IR.

## Paths

- `happy`: every declared `NODE_TYPES` member returns `true`.
- `edge_boundary_unknown_string`: a string that is not a declared node type
  (e.g. `"bogus"`) returns `false` — no throw, no coercion.
- `edge_boundary_non_string`: a non-string value (number, `null`, `undefined`,
  object, etc.) returns `false` — the `typeof value === 'string'` check short
  circuits before the array membership check.

```yaml
# isNodeType.flow — per-exported-function flow doc.
# See FLOW_CONTRACT.md for the schema.

flow: isNodeType
kind: predicate
source: code/package/src/ir/types.ts
symbol: isNodeType

inputs:
  value: "unknown — any candidate value to narrow to iNodeType"

returns:
  - "true — value is a string AND a member of NODE_TYPES"
  - "false — value is not a string, OR is a string not present in NODE_TYPES"

throws: []
calls: []
called_by:
  - parse.parseFlowchart
emits_events: []

side_effects_on_success:
  - "none"
side_effects_on_failure: "none"
transaction: "none"

test: code/package/src/ir/types.test.ts
spec: code/package/src/ir/__specs__/spec.md

ai_agent_action:
  when_to_call: "never invoked directly by an agent — an internal predicate consumed by parseFlowchart when validating an explicit node class token"
  when_not_to_call: "always, as a direct agent action — it has no network/UI entry point"
  natural_language_examples:
    - "n/a — not independently agent-invocable"
  agent_invocation: "internal — not callable"
  confirm_with_user_before: "none — read-only, pure function"
  summarize_to_user_after: "n/a — has no independent user-facing outcome"

paths:
  happy:
    - step: "call isNodeType(type) for each of the 7 declared NODE_TYPES values"
    - step: "assert the guard returns true for every one"
  edge_boundary_unknown_string:
    - step: "call isNodeType('bogus')"
    - step: "assert the guard returns false (unknown string, not a declared type)"
  edge_boundary_non_string:
    - step: "call isNodeType(42) (a non-string value)"
    - step: "assert the guard returns false without throwing (typeof check short-circuits)"
```
