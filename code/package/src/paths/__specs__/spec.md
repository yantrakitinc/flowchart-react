# src/paths/ — semantic path detection over a flow graph

## Concept

This folder is the paths port: given a renderer-agnostic `iFlowGraph` (from `src/ir/`), it enumerates every
distinct start→end route through the graph and classifies each route's overall "mood" (happy / warning / error /
neutral) from the semantic type of the edges it traverses. It exists so every consumer that wants to reason about
"the routes through this diagram" — playback (`src/react/usePlayback.ts`), path selection
(`src/react/usePaths.ts`), or any future summarization/reporting surface — shares one deterministic, pure
implementation instead of re-deriving graph traversal itself. It is a plain computation module: no HTTP, no
database, no UI, no I/O of any kind.

## Files

1. `detectPaths.ts` — exports `detectPaths(graph)`, the `classifyPath` internal helper, the `MAX_PATHS` /
   `MAX_DEPTH` guard constants, and the `iPathType` / `iFlowPath` / `iPathDetectionResult` types.
2. `index.ts` — SETUP: public barrel re-exporting `detectPaths` and its three types for consumers outside this
   folder.

## Out of scope

- Validating or parsing the incoming graph shape — `detectPaths` trusts a well-formed `iFlowGraph`; parsing lives
  in `src/parse/`.
- Laying out or rendering the detected paths — that is `src/layout/` and `src/react/`.
- Persisting path-detection results or diffing them across graph edits.
- Deduplicating structurally-identical routes beyond the `MAX_PATHS` cap (the cap bounds the search, it does not
  dedupe).
- Any HTTP, database, or UI surface — this module is synchronous, side-effect-free, and has no network or
  filesystem access.

## Machine spec

```yaml
feature_name: paths
scope_authority: claude
ui_design: not-applicable # invocation.type = internal; no UI surface exists or is implied by this feature

owns:
  - src/paths/detectPaths.ts
  - src/paths/index.ts

operation:
  name: Detect semantic paths through a flow graph
  slug: "(internal)"
  description: >-
    Enumerates every start->end route through an in-memory flow graph via depth-first search and classifies
    each route from the semantic type of the edges it traverses.
invocation:
  type: internal
chat_agent:
  when_to_call: >-
    an agent needs the set of semantic start->end routes through an in-memory flow graph (e.g. to summarize a
    diagram, drive playback, or highlight the happy path) before rendering or reporting on it
  when_not_to_call: >-
    the graph has not been parsed/validated yet, or the caller needs to mutate/persist the graph -
    detectPaths is read-only and trusts its input shape as-is
  natural_language_examples:
    - "show me the happy path through this flowchart"
    - "which routes in this diagram end in an error"
    - "how many distinct paths does this flow have"
  confirm_before: "none — read-only, pure, synchronous computation"
  summarize_after_success: "\"detected N path(s): H happy, W warning, E error, R neutral\""
  summarize_after_failure: "n/a — detectPaths never throws and has no failure return shape"
cross_cutting:
  wcag: "n/a — no UI surface; this is a headless data-computation module"
  auth: "n/a — no DB, no network, no permission check; a pure function over an in-memory argument"
  mobile: "n/a — no UI surface"
  i18n: "n/a — no user-facing strings; the only textual output (name: \"Path N\") is an internal default label a consuming UI may relabel/localize itself"
authorization:
  layer_a_brand: "n/a — no DB, pure function"
  rls_directive: "n/a — no DB"
  policies: []
  permission_slugs_used: []
  rls_deny_test: "n/a — no DB, read-only pure function, nothing to deny"
links:
  flows:
    - src/paths/__specs__/flows/detect-paths.flow.md
  tests:
    - src/paths/detectPaths.test.ts
  manual:
    - src/paths/__specs__/manual/detect-paths.md
  openapi: "n/a — no HTTP surface"
  asyncapi: "n/a — no events emitted or subscribed to"
```
