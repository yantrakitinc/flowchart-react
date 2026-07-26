# FLOW_CONTRACT — detail

Why each rule in `FLOW_CONTRACT.md` exists. The umbrella motivation — an agent with ONLY `__specs__/` must operate every feature without guessing — lives in `SPEC_CONTRACT.rationale.md`.

## Why `flow.yaml`, not `flow.md`

The flow doc's content is 90% structured (16 required keys, named paths, ai_agent_action sub-map) and 10% prose. Markdown-with-YAML-frontmatter forced a parser into both modes and made automated checks fragile. Pure YAML simplifies: every reader (verify script, agent, generator) parses one format. The single prose-y field is `mermaid:` (the diagram), which fits naturally as a multiline YAML string. The `paths:` section becomes a structured map (`happy`, `error_*`, `edge_*`) instead of free-form prose.

## Each of the 17 required `flow_yaml` keys (+ 1 optional) — why each one

The flow doc is the agent's call-graph map. Each key answers a question the agent (or a developer ramping on the code) will inevitably ask. The 17 required keys split into four groups; `mermaid` is the one optional key.

**Identity (4 keys)**:
- `flow` — the function name. Anchor.
- `kind` — request-handler, predicate, service-method, etc. Tells the agent what kind of behavior to expect (an HTTP handler vs a pure helper).
- `source` — path to the source-of-truth `.ts` file. The agent can jump to the code if it has source access.
- `symbol` — the exported symbol within `source`. Disambiguates when a file exports multiple functions.

**I/O contract (4 keys)**:
- `inputs` — argument types. The agent constructs calls from this without reading the source.
- `returns` — success-shape descriptions. The agent knows what to expect back.
- `throws` — declared errors. The agent knows what failure modes are reachable.
- `transaction` — transaction scope (or "none"). Critical for state-mutating ops; the agent + a human reader knows whether the call is atomic.

**Call graph (5 keys)**:
- `calls` — downstream calls. The agent reasons about side-effect chains.
- `called_by` — upstream callers. The agent knows where this function is invoked from (helps when planning a multi-step flow).
- `emits_events` — events emitted (or `[]`). Hooks into the async event graph; chains with `asyncapi.yaml`.
- `side_effects_on_success` — what state changes on the happy path (or `["none"]`). Differentiates pure functions from state-mutators without reading the body.
- `side_effects_on_failure` — what state changes when the function fails (or `"none"`). Forces explicit reasoning about partial-state failure modes.

**Documentation (4 keys)**:
- `test` — path to the test file. The agent can read the tests to learn invariants.
- `spec` — path to the spec.yaml. The contract anchor.
- `ai_agent_action` — the 6-sub-key map (see `SPEC_CONTRACT.rationale.md` for the per-key rationale). The agent's invocation contract for this specific function.
- `paths` — named scenario paths (`happy`, `error_*`, `edge_*`). The agent walks the path it wants to test or trigger.

**Optional (1 key)**:
- `mermaid` — diagram. Required when the function coordinates ≥ 3 collaborators or has ≥ 2 distinct paths; not required for trivial flows.

Together the 17 required keys mean an agent reading ONLY the flow.yaml (no source code) can: identify the function, construct a valid call, predict the return shape, know the failure modes, reason about side effects + transactions, find the test + spec, invoke under the right user-facing contract, and trace any named scenario.

## Why flows enumerate every path

A flow.yaml exists to turn unknowns into knowns: enumerate every path the function can take — happy, every error, every edge — so implementation and tests derive from a complete behavior map with no unknowns left to discover later. A missing error/edge/concurrency/authority path is the exact gap a production bug slips through; writing the flow is where the unknowns are surfaced, and the tests then cover what it enumerates. `KNOWN-NOT-VALIDATED` is honest disclosure, not a dodge: it enumerates a slim-probability path (turns the unknown into a stated known) without a test — which is why it is reserved for genuinely improbable edges and never for a realistic failure/authority/write path.

## Why error paths must end at a user-facing explanation

Enumerating `error_*` paths makes the flow exhaustive at the function boundary — every throw is named. But a named throw is not yet an outcome a user can live with. The `error_terminal` rule closes the gap between "the code handles this failure" and "the user understands this failure." A path that ends at a raw `409`, an unhandled throw, or a spinner that never resolves has technically been enumerated and has still stranded the person on the other end.

The rule borrows its bar from `USER_JOURNEYS#journey-outcomes`: the terminal step states what happened, why, and what next, in language the user reads — and names the alternative flow when a real recovery exists. This is what lets `journey_completeness.outcome_coverage` count an explained failure as coverage: a journey step is satisfied when its flow lands the user at success *or* at one of these explained terminals, and only then. Without `error_terminal`, "covered" could mean "the flow reaches a throw," which is exactly the silent dead-end the journey doctrine forbids.

## Why the blind traversal audit is a set-level check, not a per-flow one

Each flow can be individually exhaustive and the *set* can still be un-walkable by a stranger: the flows assume context — an id from a screen never documented, a transition every author knew but no one wrote down. Per-flow rules cannot catch this because the defect lives between flows, in the seams. The blind traversal audit (`USER_JOURNEYS#blind-traversal-audit`) is the only check that walks the seams: a domain-only goal traversed using nothing but `docs/flows/`, where every point the walk cannot reach names a missing or too-thin flow. `journey_completeness.blind_traversal` defers to it for the same reason this contract defers set-level completeness to `USER_JOURNEYS.md` — the flow contract owns the per-flow shape; the journey standard owns whether the set, walked cold, actually gets a user from A to B.

## Why journey_completeness is bidirectional

The per-flow rules make each flow exhaustive; `journey_completeness` makes the SET exhaustive. Its authoritative journey list is the outside-in catalog owned by `USER_JOURNEYS.md` (modeled from the domain and peer apps, not transcribed from these flows), because a journey list back-derived from your own flows can only re-confirm what you already built — it cannot reveal the intent you failed to serve.

Completeness runs both ways because each direction catches a different defect. The forward direction (every journey step maps to a flow) catches a missing capability: a user cannot finish what they arrived to do. The reverse direction (every flow maps to a journey) catches an orphan: a flow that satisfies no journey is scope built for its own sake, which still demands specs, tests, and maintenance. A flow set that is journey-complete forward but carries an orphan flow is as non-compliant as one with an uncovered step — one is a hole, the other is dead weight, and "nothing more, nothing less" rejects both. The orphan rule and the binary verdict live in `USER_JOURNEYS.md` (`orphan_flow`, `reconciliation`); this section explains why the flow contract defers its set-level completeness to them.

Last updated: 2026-07-25T15:22:50Z
