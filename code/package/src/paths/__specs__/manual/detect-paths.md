# detect-paths

## Target

n/a — `detectPaths` is a pure TypeScript library function with no HTTP, CLI, or UI surface; there is no
local/live URL to point a browser or HTTP agent at. This flow deviates from the standard browser/HTTP execution
model: run each step in a Node/TSX REPL (or a disposable scratch script) that imports `detectPaths` from the
built package (or directly from `src/paths/detectPaths.ts` inside this repo via `tsx`).

## Preconditions

- The package is checked out and its dependencies installed (`pnpm install`); no build step is required to run
  `tsx` directly against `src/paths/detectPaths.ts`.
- No auth, no seed data, no running peer service — `detectPaths` takes its entire input as a function argument.

## Steps

1. **action**: import `detectPaths` and call it with an empty graph: `detectPaths({ id: 'g', name: 'G', direction: 'TD', nodes: [], edges: [] })`.
   **expected**: returns exactly `{ paths: [], startNodeIds: [], endNodeIds: [] }`; does not throw.
2. **action** (adversarial — dangling reference): call `detectPaths` with one `type: 'start'` node `a` and one edge `{ id: 'e0', from: 'a', to: 'ghost', type: 'default' }` where `'ghost'` is NOT present in `nodes`.
   **expected**: does not throw and does not hang; returns one path with `nodeIds: ['a']`, `edgeIds: []`, `type: 'neutral'` — the dangling edge is silently ignored, never dereferenced as a real node.
3. **action** (adversarial — cycle with no reachable end): call `detectPaths` on a graph with only two `type: 'action'` nodes `a`/`b` and edges `a->b` and `b->a` (a pure 2-cycle, no start/end types, no acyclic exit).
   **expected**: does not recurse forever; returns within milliseconds with `startNodeIds` and `endNodeIds` both `['a']` (first-node fallback) and exactly one path.
4. **action** (adversarial — combinatorial blowup): call `detectPaths` on an 8-layer "diamond stack" graph where each layer doubles the branch count (2^8 = 256 possible start-end routes).
   **expected**: returns in well under a second with `result.paths.length === 50` exactly (never 256, never unbounded) — the `MAX_PATHS` guard held under adversarial branching pressure.
5. **action** (adversarial — runaway depth): call `detectPaths` on a single linear chain of 105 nodes (one edge between each consecutive pair, first node `type: 'start'`, last node `type: 'end'`).
   **expected**: does not stack-overflow or hang; returns exactly one fallback neutral path covering all 105 nodes (the `MAX_DEPTH` guard, not the direct start->end route, produced the result).
6. **action** (adversarial — malformed classification tie): call `detectPaths` on a 3-node chain `start -> action -> end` where the first edge is `type: 'error'` and the second edge is `type: 'happy'` (error count ties happy count at 1 each).
   **expected**: the recorded path's `type` is `'error'`, NOT `'happy'` — confirms the tie-breaks toward error rather than defaulting to the more common happy classification.

## Assertions

- MUST NOT throw, hang, or recurse unboundedly for ANY of the six inputs above, including the empty graph,
  the dangling edge, the 2-cycle, the 256-route blowup, and the 105-node chain.
- MUST always return an object shaped `{ paths: iFlowPath[], startNodeIds: string[], endNodeIds: string[] }` —
  never `undefined`, never a thrown error, never a partial/malformed shape.
- MUST cap `paths.length` at 50 (`MAX_PATHS`) even under combinatorial adversarial input.
- MUST NOT record any DFS route longer than 100 node ids (`MAX_DEPTH`) — a graph engineered to exceed this
  falls back to the single neutral path instead of a truncated/corrupt route.
- MUST classify a route with an error-edge count that ties or exceeds its happy-edge count as `'error'`, never
  `'happy'` or `'neutral'`.

## Report

n/a — this repository is a published npm library with no running server, so there is no local
`/api/v1/manual-results/<flow>` route to POST results to. Record each step's PASS/FAIL verdict (and any
deviation from the expected outcome) as plain text in the CLI agent's own task output; do not fabricate a POST
to an endpoint this package does not expose.
