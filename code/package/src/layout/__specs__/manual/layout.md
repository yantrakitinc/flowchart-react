# layout

> Deviation note (spec-derived, honest by design): `layout()` is `invocation.type: internal` — a pure
> computation export of a published npm package (`@yantrakit/flowchart-react`), not an HTTP/CLI/UI route.
> This repo is a `PACKAGE_PROJECT_STANDARDS`-shaped npm package with no server and no `/api/*` surface,
> so the standard `POST /api/v1/manual-results/<flow>` route named by `MANUAL_FLOWS#manual-md` does not
> exist here — see `## Report` below for the resulting, honestly-stated deviation. The one real
> browser-drivable surface this repo ships today is its own Storybook dev server (`pnpm storybook`,
> `@storybook/react-vite` builder), whose Vite dev server serves every project source file as an ES
> module at its filesystem-relative URL (e.g. `/src/layout/index.ts`) — this is standard, real Vite
> dev-server behavior, not a fabricated endpoint. This flow drives `layout()` through that surface.

## Target

local — `http://localhost:6006` (this package's own Storybook dev server; start it with `pnpm storybook`
before running this flow)

## Preconditions

- `pnpm storybook` is running locally on port 6006.
- No authentication, no seed data, no running peer service.

## Steps

1. **action**: Navigate the browser to `http://localhost:6006`.
   **expected**: The Storybook shell loads with no network error (HTTP 200; no red error overlay).

2. **action**: Open DevTools → Console and run:
   ```js
   const { layout } = await import('/src/layout/index.ts');
   const result = await layout({
     id: 'g', name: 'G', direction: 'TD',
     nodes: [{ id: 'a', label: 'A', type: 'start' }, { id: 'b', label: 'B', type: 'end' }],
     edges: [{ id: 'e0', from: 'a', to: 'b', type: 'default' }],
   });
   console.log(JSON.stringify(result));
   ```
   **expected**: Resolves without throwing. `result.nodes.length === 2`; every node has numeric `x`,
   `y`, `width === 180`, `height === 64`; `result.edges.length === 1`; `result.direction === 'TD'`.

3. **action** (adversarial — malformed graph): re-run the same call from step 2 but with
   `edges: [{ id: 'e0', from: 'a', to: 'ghost', type: 'default' }]` (`ghost` is not a real node id).
   **expected**: Still resolves without throwing — `layout()` does not validate edge endpoints.
   `result.edges` contains the dangling edge unchanged (pass-through). Both real nodes (`a`, `b`) still
   receive numeric `x`/`y`. The dangling edge MUST NOT cause a thrown error or a dropped node.

4. **action** (adversarial — empty graph): run
   `await layout({ id: 'g', name: 'G', direction: 'TD', nodes: [], edges: [] })`.
   **expected**: Resolves; `result.nodes` is `[]`, `result.width === 0`, `result.height === 0`. No throw
   on empty input.

5. **action** (adversarial — opt-in engine without a guaranteed install): run
   ```js
   const { layout, elkEngine } = await import('/src/layout/index.ts');
   try {
     const r = await layout(
       { id: 'g', name: 'G', direction: 'TD', nodes: [{ id: 'a', label: 'A', type: 'start' }], edges: [] },
       { engine: elkEngine }
     );
     console.log('elk resolved:', JSON.stringify(r));
   } catch (e) {
     console.log('elk error:', e.message);
   }
   ```
   **expected**: Exactly one of two outcomes — (a) it resolves, with `elk` producing a numeric `x`/`y`
   for node `a`; or (b) it rejects with a message matching `/optional peer dependency "elkjs"/`. Record
   which outcome occurred. Any THIRD outcome (an uncaught exception with no actionable message, e.g. a
   raw "Cannot find module" reaching the console unhandled) is a FAIL.

6. **action** (adversarial — a direction value outside the typed `iDirection` union, simulating an
   untyped/JS caller bypassing TypeScript): run
   `await layout({ id: 'g', name: 'G', direction: 'DIAGONAL', nodes: [{ id: 'a', label: 'A', type: 'start' }], edges: [] })`.
   **expected**: Does not crash the page or throw an uncaught exception the console can't explain.
   Record the ACTUAL observed `result` (this input is outside the documented `iDirection` contract —
   `dagreEngine`'s `RANKDIR_BY_DIRECTION` map has no `'DIAGONAL'` entry, so this step is exploratory:
   report exactly what happened, do not assume a specific outcome in advance).

If any step fails twice, record that step FAIL with a note and STOP — do not loop the step.

## Assertions

- MUST: `layout()` never throws synchronously and always returns a `Promise` that either resolves to a
  full `iPositionedGraph` shape (`nodes`, `edges`, `direction`, `width`, `height` all present) or rejects
  with an `Error` carrying a human-readable `.message`.
- MUST: every node in a resolved result carries numeric `x`/`y`/`width`/`height` — never `undefined` or
  `NaN`.
- MUST: a dangling edge (an endpoint id not present in `nodes`) is passed through unchanged in
  `result.edges` and never causes a real node to be dropped from `result.nodes`.
- MUST: requesting the ELK engine without `elkjs` installed rejects with a message containing
  `optional peer dependency "elkjs"` — never a raw "Cannot find module" with no guidance.
- MUST NOT: `layout()` mutate the input `graph` argument — after each call, re-inspect the original
  `graph`/`nodes`/`edges` variables used to build the request and confirm they are unchanged (same
  length, same field values) from what was constructed in the step.
- MUST NOT: any uncaught/unexplained exception appear in the DevTools console during steps 2–6, other
  than the deliberately-caught rejection in step 5's `catch` branch.

## Report

This package repo ships no server and no `/api/v1/manual-results/<flow>` route (it is a plain npm
package per `PACKAGE_PROJECT_STANDARDS`, not a web app) — there is no POST target to report results to.
Deviation from `MANUAL_FLOWS#manual-md`'s `## Report` requirement, stated explicitly rather than
fabricating a nonexistent endpoint: print the full step-by-step results (each step's `action`,
`expected`, and the ACTUAL observed console output/value) to the chat/response as the sole report
mechanism for this flow.
