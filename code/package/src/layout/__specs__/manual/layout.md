# layout

> Copy-paste this whole file into the Claude Code Chrome extension, or run its steps
> directly with `node`/`vitest` in a checkout of this package. See MANUAL_FLOWS.md
> `manual_md` for the general schema. Lives at:
> `code/package/src/layout/__specs__/manual/layout.md`
>
> **Adaptation note**: `layout()` has NO HTTP/CLI/UI surface of its own — it is a
> pure in-process library function (`@yantrakit/flowchart-react`'s public API). This
> package ships no server, so there is no `/api/v1/manual-results/<flow>` route to
> POST to. This playbook is adapted to that shape: every step is a runnable snippet
> against the built or source package, and the `## Report` section below prints
> results to stdout instead of POSTing them (see that section for the explicit
> deviation from the standard route).

## Target
local — a checkout of this repo with `pnpm install` run (no server, no browser
navigation; steps run via `node --experimental-strip-types` / `pnpm vitest run` /
a scratch `.ts` file against `src/layout/index.ts`, or against the built
`dist/index.mjs` for a published-package smoke check)

## Preconditions
- `pnpm install` has run at `code/package/`
- for steps 5-6 (ELK path): run once with `elkjs` present (already a devDependency
  here) and, if you want to reproduce the missing-peer-dependency error, run once
  in an environment where `elkjs` is NOT resolvable (e.g. a fresh install of the
  published `@yantrakit/flowchart-react` package alone, with `elkjs` never added)

## Steps
1. Build a 3-node linear IR graph (`{ id:'g', name:'g', direction:'TD', nodes:[{id:'a',label:'A',type:'start'},{id:'b',label:'B',type:'action'},{id:'c',label:'C',type:'end'}], edges:[{id:'e0',from:'a',to:'b',type:'default'},{id:'e1',from:'b',to:'c',type:'default'}] }`) and call `await layout(graph)` with no options → expected: resolves `{ direction:'TD', nodes: 3 entries, edges: 2 entries }`; every node's `position.x`/`position.y` is a finite number; node `b`'s `position.y` is greater than node `a`'s (top-down stacking).
2. **Adversarial — abuse input**: add a THIRD edge to the same graph, `{ id:'e2', from:'a', to:'ghost', type:'default' }`, referencing a node id (`ghost`) that does not exist in `nodes` → expected: `layout()` still resolves without throwing; the returned `edges` array contains the dangling edge unchanged (`source:'a', target:'ghost'`) — `layout()` does not validate edge endpoints, by design (see spec.md).
3. **Adversarial — cross a real failure boundary**: call `await layout(graph, { engine: elkEngine })` in an environment where `elkjs` is genuinely not resolvable (e.g. temporarily rename/remove `node_modules/elkjs`) → expected: the promise REJECTS with an error whose message matches `/requires the optional peer dependency 'elkjs'/`; no partial result, no thrown-but-uncaught exception, no crash of the host process.
4. Re-run step 1's graph with `direction: 'LR'` instead of `'TD'` → expected: node `b`'s `position.x` is greater than node `a`'s; `position.y` values are comparable/flat (horizontal stacking, not vertical).
5. Re-run step 1's graph with `{ engine: elkEngine }` (elkjs installed) → expected: resolves the same node/edge counts as step 1; every position is a finite number (ELK and dagre need not produce identical coordinates, only both valid).
6. **Adversarial — replay with a mutated engine**: pass a hand-written engine object `{ name: 'empty', run: () => Promise.resolve(new Map()) }` as `options.engine` → expected: `layout()` resolves successfully and EVERY node's position defaults to `{ x: 0, y: 0 }` (the engine returned no positions at all) — proves the `?? {0,0}` fallback holds even when an engine returns nothing.

## Assertions
- MUST hold: every call to `layout()` resolves a plain object matching `{ direction, nodes: iPositionedNode[], edges: iRenderEdge[] }` when the chosen engine's `run()` resolves; every node in the input graph appears exactly once in the output `nodes` array, in the same order.
- MUST hold: swapping `direction` (`TD`/`BT`/`LR`/`RL`) and swapping `engine` (`dagreEngine`/`elkEngine`/a custom object) never changes the shape of the result — only the numeric positions differ.
- MUST NOT happen: `layout()` throwing synchronously (it is always a promise-based rejection, never a thrown exception escaping before the promise is returned) OR silently swallowing an engine rejection (the rejection message must survive unchanged and contain the original text: `"requires the optional peer dependency 'elkjs'"` for the missing-elkjs case).
- MUST NOT happen: a dangling edge (step 2) causing an unhandled exception anywhere in the call chain — the underlying engines silently filter it internally; `layout()`'s own edge mapping never filters or validates.

## Report
This package ships no HTTP server, so there is no `/api/v1/manual-results/layout`
route to POST to (see the Adaptation note above — a documented, deliberate
deviation from the MANUAL_FLOWS.md route convention, which assumes a running app
with an API surface). Instead: print every step's number, the action taken, the
observed result (resolved value or rejection message), and pass/fail to stdout, in
order, and paste that console output back as this flow's result.
