# USER_JOURNEYS

> Scope: the outside-in user-journey catalog (docs/journeys/) and the circular discover→match→reconcile→update loop
that runs BEFORE code and keeps journeys and flows in a bidirectional map. Journeys feed REQUIREMENTS_CONTRACT.md and
are the set-level counterpart traced against FLOW_CONTRACT#journey-completeness. Siblings: FLOW_CONTRACT.md (per-flow
+ set-level flow contract), REQUIREMENTS_CONTRACT.md (user-locked requirements the journeys feed), SITE_BLUEPRINT.md
(page-tier coverage matrix that cites journeys). ---------- what a user journey is ---------- A journey is modeled
from the perspective of a user who ARRIVES at the product with an intent, derived from the nature of the SaaS category
and comparable apps in the same domain — NOT from what this product currently offers.

```meta
version: 1
last_updated: 2026-07-25T15:22:50Z
```

## user_journey

- `id`: string _(J-<NNN>, zero-padded, build-order stable)_
- `persona`: string _(who arrives (role + context, never a generic name))_
- `intent`: string _(what they arrive expecting to accomplish)_
- `trigger`: string _(what brings them here (the real-world need))_
- `steps`: list<string> _(ordered intent-level steps to accomplish the intent)_
- `success`: string _(the goal-reached terminal — what "they got what they came for" looks like)_
- `failure_outcomes`: list<failure_outcome> # every foreseeable way this journey fails to reach `success`;
    _[] is NON-COMPLIANT for a journey that can demonstrably fail_
    _(auth, payment, quota, network, validation, conflict, expiry)_
- `provenance`: _(REQUIRED — proves outside-in origin)_
  - `domain`: string _(the SaaS category this journey belongs to)_
  - `inspired_by`: list<string> _(peer apps / domain conventions that model this intent)_
  - `not_derived_from_our_flows`: bool _(MUST be true; a journey back-derived from our own flows is NON-COMPLIANT)_
- `maps_to_flows`: list<string> _(flow ids satisfying each step; [] until MATCH fills it)_

## failure_outcome

_a non-success terminal of a journey (or a flow error path)_

- `when`: string _(the condition that diverts the user off the happy path)_
- `explanation`: string _(what the user is TOLD — clear, specific, never a dead-end or raw code)_
- `alternative`: string _(the recovery flow/journey the user is offered, OR)_
    _"terminal — no recovery exists; explanation suffices"_

## journey_outcomes

- `principle`: a journey is ACHIEVED when the user reaches EITHER terminal kind — `success` (the goal) OR an `explained_failure` (they cannot reach the goal but are told, clearly and specifically, what happened, why, and what they can do next). Reaching a satisfactorily explained error terminal IS journey achieved.
- `explained_failure`:
  - `requires`: [what_happened, why, what_next] _(the terminal states all three in user-facing language)_
  - `alternative_when_warranted`: when a reasonable recovery exists (e.g. "email already registered" → offer sign-in / password-reset), the terminal MUST name that alternative flow. When the failure is genuinely terminal (no recovery exists), a clear explanation alone satisfies — never invent a dead-end alternative just to have one.
- `banned`:
  - a journey whose only documented non-success outcome is a silent failure, a raw error code, a dead-end, or an unexplained stop — that is a journey NOT achieved
  - an empty failure_outcomes list on a journey that can demonstrably fail — enumerate them (SCENARIO_ENUMERATION.md is the source list of failure categories to walk)
- `coverage`: journey_completeness counts an explained_failure terminal as valid coverage of a step — a step is covered when a flow leads the user to `success` OR to an explained_failure terminal (FLOW_CONTRACT#flow-yaml + FLOW_CONTRACT#error-terminal), and NEVER when it leads to an unexplained stop

## journey_loop

- `order`: [discover, match, reconcile, update] _(cycles; never terminates while the product evolves)_
- `runs_before_code`: true _(journeys + flows exist before any implementation)_

- `discover`:
  - `blind`: true _(generated with NO access to our flows / requirements / site)_
  - `owner`: journey-cartographer-core _(a repo-blind dispatched subagent — blindness is structural, not honor-system)_
  - `inputs_allowed`: [saas_domain, peer_app_scan, domain_ux_conventions]
  - `inputs_forbidden`: [our_flows, our_requirements, our_site, our_specs, our_code]
  - `output`: docs/journeys/J-<NNN>-<slug>.md _(one file per journey + provenance)_
  - `coverage`: enumerate the long-tail of intents a real user in this category arrives with — not only the obvious happy intent; diverse personas × intents

- `match`:
  - `rule`: every journey step maps to exactly one flow (or a named path within a flow); write the missing flows (FLOW_CONTRACT.md). A journey step that maps to no flow is a missing capability.
  - `output`: docs/journeys/00-INDEX.md _(the bidirectional journey↔flow map)_

- `reconcile`:
  - `rule`: read the code/specs, enumerate the flows that ACTUALLY exist, and surface every capability the journeys did not anticipate. A flow that maps to no journey is an ORPHAN (see orphan_flow).
  - `reads`: [flows, __specs__, source]

- `update`:
  - `rule`: add journeys the code revealed a real user would take; retire journeys that no longer fit; then the loop returns to discover for the next cycle.

## reconciliation

- `forward`: every journey step maps to >= 1 flow _(gap = missing capability = defect)_
- `reverse`: every flow maps to >= 1 journey _(gap = orphan feature (see orphan_flow))_
- `index`: docs/journeys/00-INDEX.md records BOTH directions so any gap is visible
- `index_terminal_lines`: ["unmapped_journeys: 0", "orphan_flows: 0"] _(literal machine-checkable data lines; both MUST be 0)_
- `shared_verdict`: the same binary discipline as FLOW_CONTRACT#journey-completeness — both blocks state BOTH directions (every journey step→flow AND every flow→journey); this one is the reconciliation-framed phrasing of the identical verdict. Edit them together; neither softens the other.
- `verdict`: '"Are journeys and flows reconciled?" has EXACTLY TWO answers — nothing between:'
- `verdict_yes`: 'YES — 100%: every journey step maps to a flow AND every flow maps to a journey.'
- `verdict_no`: 'NO: at least one journey step maps to no flow, OR at least one flow maps to no journey. Name the gap(s). "Still have flows/journeys to reconcile" IS the NO answer.'
- `no_third_answer`: BANNED — "mostly", "nearly", "the important ones", any percentage other than 100, any qualification dressing a NO as a YES. One unmapped step or one orphan flow = the answer is NO.

## orphan_flow

- `rule`: a flow that no journey needs is HARD RED — either add the journey that legitimizes it (a real user in this domain would take it) or cut the flow. Never keep an unjustified flow.
- `banned`: shipping a capability no user journey arrives for ("nothing more, nothing less").

## blind_traversal_audit

- `runs_when`: journeys + flows are reconciled (unmapped_journeys and orphan_flows both at 0) — this is the acceptance test OVER a complete set, never a substitute for building it
- `owner`: flow-traversal-auditor-core _(dispatched; the two phases are structurally blind by construction)_
- `phase_1_pick_goal`:
  - `knows_only`: [saas_category, one_line_product_description] _(NOTHING about our project, flows, code, journeys, or how it works)_
  - `forbidden_inputs`: [our_flows, our_journeys, our_requirements, our_specs, our_code, our_site]
  - `output`: a Point A (realistic start state) + a Point B (end goal) + a few intermediate waypoints, invented from ONLY the nature of a SaaS in this category — a plausible goal a real user in the domain would hold. The picker does not know whether our product can even do it.
  - `priority`: rank the goal by likelihood × importance × traffic — the intents peer apps and domain conventions show are the MOST COMMON, the MOST CRITICAL, and the HIGHEST-TRAFFIC in this category come first. Each run picks the highest-priority goal NOT YET audited (read the audit index for what is already covered — the ONLY thing phase 1 may read, and only to avoid repeating a goal).
- `phase_2_traverse`:
  - `reads_only`: [docs/flows/] _(the human flow catalog + the flows/<fn>.flow.yaml it links — NO code, NO journeys, NO other specs)_
  - `rule`: walk A → each waypoint → B using ONLY the flow docs. At every point, find the flow that carries the user
    to the next point. A point no flow reaches, or a transition the flow docs do not document, is a GAP (a missing
    flow, or a flow too thin to traverse). Error terminals count — arriving at a well-explained failure terminal
    (journey_outcomes) is a valid arrival; a silent dead-end or an undocumented transition is a gap.
- `repeat`:
  - `rule`: this is a REPEATED exercise, never one-and-done. Re-run it — each run a fresh blind goal-pick + traversal — walking DOWN the priority order (most-likely, most-important, high-traffic first).
  - `until`: the high-value goal space is covered — the top-priority goals are all audited AND >= 2 consecutive runs surface no new gap (loop-until-dry). Stopping after one run, or before the most-likely / most-important / high-traffic goals are all reached, is NON-COMPLIANT.
  - `owner_of_loop`: the pm (or the active session) dispatches flow-traversal-auditor-core repeatedly and stops on the `until` condition; each dispatch is a fresh blind context.
- `output`:
  - `per_run`: docs/journeys/blind-traversal/BT-<NNN>-<slug>.md _(the goal (with its likelihood/importance/traffic rank), the step-by-step traversal log, and every gap found)_
  - `index`: docs/journeys/blind-traversal/00-INDEX.md _(the prioritized goal backlog, which goals are covered, and the terminal data lines below)_
- `index_terminal_lines`: ["unreachable_goals: 0", "priority_goals_uncovered: 0"] _(both MUST be 0: no audited goal has a gap, and no high-priority goal is left un-audited)_
- `verdict`: same binary discipline as reconciliation — unreachable_goals at 0 means every audited goal is self-sufficient in the flow docs; priority_goals_uncovered at 0 means the most-likely/important/high- traffic goals are all audited. Any n above 0 in either line NAMES work left to do. A gap is a DEFECT, not backlog; "we'll add that flow / run that goal later" IS the NO answer.
- `enforced_by`: scripts/verify/verify-journeys.mjs _(requires the blind-traversal index + both terminal lines at 0 once features exist)_

## feeds

- `requirements`: journeys are the outside-in INPUT that shapes docs/requirements/REQUIREMENTS.md; the user still locks REQUIREMENTS (REQUIREMENTS_CONTRACT.md) — journeys inform it, never replace it
- `flow_completeness`: this catalog IS the authoritative journey list that FLOW_CONTRACT#journey-completeness traces against
- `blueprint`: SITE_BLUEPRINT.md coverage matrix cites journeys; unmapped_journeys must be 0
- `blind_traversal`: docs/journeys/blind-traversal/00-INDEX.md carries the audit's terminal unreachable_goals + priority_goals_uncovered data lines (both must be 0), read by the same gate (blind_traversal_audit) — the audit is repeated down the priority order until both are 0

## enforced_by

scripts/verify/verify-journeys.mjs _(missing 00-INDEX, missing provenance, any unmapped)_

    _journey / orphan flow, or unreachable_goals > 0 = red_

Last updated: 2026-07-25T15:22:50Z