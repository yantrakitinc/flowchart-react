# src/paths — semantic path detection engine

## Concept

`detectPaths` is the package's differentiator over plain Mermaid rendering: given a parsed
`iFlowGraph` (nodes + directed edges, each edge carrying a semantic `iEdgeType` of
`happy | warning | error | default`), it enumerates every concrete start→end route through the
graph via DFS, then classifies each route as a whole (`iPathType`: `happy | warning | error |
neutral`) from the mix of edge types it crosses. A UI consumer (`usePaths`, `PathDrawer`) uses the
result to let a user step through "what happens on the happy path" vs. "where do the error routes
go" without re-deriving graph semantics itself.

Start/end node resolution degrades gracefully when a graph has no explicit `type:'start'` /
`type:'end'` nodes: no-incoming-edge nodes become starts (falling back to the first node), and
no-outgoing-edge nodes become ends. Two guards (`MAX_PATHS=50`, `MAX_DEPTH=100`) protect the DFS
against pathological or cyclic graphs — enumeration is capped, not infinite, and a cyclic graph with
no resolvable start→end route still returns a single neutral fallback path over all nodes so callers
never receive an empty result for a non-empty graph.

`ui_design: not-applicable` — `invocation.type: internal`; this module renders no UI and exposes no
HTTP/CLI/UI surface of its own. It is a pure-TS computation consumed by `src/react/usePaths.ts` and
`src/react/PathDrawer.tsx`, which own their own UI design contracts.

## Files

1. `detectPaths.ts` — the module. Exports `detectPaths(graph): iPathDetectionResult`, plus the
   `iPathType`, `iFlowPath`, `iPathDetectionResult` types. Internal (unexported) helpers:
   `resolveStarts`, `resolveEnds`, `findAllPaths` (guarded DFS), `classifyPath`.
2. `index.ts` — barrel: re-exports `detectPaths` and its three public types.
3. `detectPaths.test.ts` (SETUP/behavior test file) — Vitest coverage of every classification
   branch, both start/end resolution paths (explicit and inferred), the MAX_PATHS/MAX_DEPTH guards,
   the no-route neutral fallback, an undeclared-edge-target graph, and the solo-node case.

## Out of scope

- Does not parse Mermaid text — that is `src/parse/parseFlowchart.ts`; `detectPaths` only consumes
  an already-built `iFlowGraph`.
- Does not lay out or position nodes — that is `src/layout/`.
- Does not render anything — consuming React code (`usePaths`, `PathDrawer`) owns presentation.
- Does not attempt to find the *shortest* or *optimal* path, only every simple path (no repeated
  node) between resolved start(s) and end(s), bounded by the two guards.
- Does not validate the input graph's structural well-formedness (e.g. duplicate node ids, edges to
  missing nodes) — a dangling edge is silently skipped by the adjacency map rather than rejected;
  that validation is `src/ir/schema.ts`'s job.
- The test file lives flat at `src/paths/detectPaths.test.ts`, not under a `__tests__/` subfolder —
  documented as-is (legacy backfill mode; this spec reproduces the shipped source, it does not
  restructure it).
- `manual/detect-paths.md` is adapted for a pure-TS library with no running HTTP/UI app: there is no
  `manual-results` POST route to report to (MANUAL_FLOWS' HTTP-surface machinery is `NOT REQUIRED`
  here — see `standards-compliance.yaml`); the playbook instead has the agent run a Node script
  against the built package and record PASS/FAIL inline.
