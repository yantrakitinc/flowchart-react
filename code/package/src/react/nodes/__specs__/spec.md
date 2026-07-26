# `src/react/nodes/` — flow-coverage colocation satellite of `react-rendering-layer`

## Concept

This `__specs__/` folder exists solely to colocate the mandatory per-exported-symbol `flows/` docs for
`FlowNode.tsx` and `registry.ts` next to their source (the flow-coverage gate resolves a symbol's flow
doc relative to the symbol's own source directory, not the feature root). It does NOT declare a
separate feature — `src/react/nodes/` is owned by, and its files are covered under, the
`react-rendering-layer` feature declared at `src/react/__specs__/spec.md`; see that spec for the full
concept, scope, and machine contract.

## Files

See `src/react/__specs__/spec.md` (`react-rendering-layer`) — `FlowNode.tsx` and `registry.ts` are
both documented there.

## Out of scope

- Declaring a second `feature_name` for this subfolder — ownership stays with `react-rendering-layer`.

## Machine spec

```yaml
# Not a feature declaration (no feature_name). The `component: true` marker tells
# verify-source-coverage this folder's source files resolve ownership via the
# nearest ancestor feature spec (react-rendering-layer), not via this file's
# own owns: list — this spec.md exists only to satisfy the mandatory
# __specs__/spec.md-per-__specs__-folder gate for the colocated flows/ docs.
component: true
```
