# FLOW_CONTRACT

> Scope: the flows/<fn>.flow.yaml contract — the 17-key schema and the exhaustive path-enumeration doctrine (happy /
error_* / edge_* + KNOWN-NOT-VALIDATED). Siblings: SPEC_CONTRACT.md (__specs__/ layout + spec schemas),
MANUAL_FLOWS.md (manual/<flow>.md), AGENT_AFFORDANCES.md. ---------- flow.yaml schema ---------- A flow.yaml
ENUMERATES EVERY PATH the function can take — happy, every error, every edge — so implementation + tests derive from a
complete behavior map. An incomplete flow IS a defect. A happy-path-only flow for an operation that can fail, writes
data, or checks authority is NON-COMPLIANT — do not stub it.

```meta
version: 1
last_updated: 2026-07-25T15:22:50Z
```

## flow_yaml

- `flow`: string _(function name)_
- `kind`: enum[request-handler, predicate, service-method, repository-method, helper, composition-root]
- `source`: path _(path to the .ts file)_
- `symbol`: string _(exported symbol within source)_
- `inputs`: map<string, string> _(arg-name → type-description)_
- `returns`: list<string> _(possible return-shape descriptions)_
- `throws`: list<string> _(declared error names; [] allowed)_
- `calls`: list<string> _(downstream calls; [] allowed)_
- `called_by`: list<string> _(upstream callers)_
- `emits_events`: list<string> _(event names; [] allowed)_
- `side_effects_on_success`: list<string> _(["none"] allowed)_
- `side_effects_on_failure`: string _("none" or description)_
- `transaction`: string _("none" or scope description)_
- `test`: path _(path to test file)_
- `spec`: path _(path to this folder's spec.yaml)_
- `ai_agent_action`: _(MUST be a map (not prose))_
  - `when_to_call`: string
  - `when_not_to_call`: string
  - `natural_language_examples`: list<string>
  - `agent_invocation`: string _(HTTP shape | UI nav | server-action name | "internal — not callable")_
  - `confirm_with_user_before`: string
  - `summarize_to_user_after`: string
- `paths`: _(named scenario paths — MUST be exhaustive)_
  - `happy`: list<step> _(required; ≥ 1)_
  - `error_*`: list<step> _(one per entry in `throws` AND per non-ok return — required when either is non-empty)_
  - `edge_*`: list<step> _(required for each applicable risk class the operation touches:)_
    _  edge_concurrent_*   — when a read precedes a write (TOCTOU/atomicity); name the race + the resolution_
    _  edge_partial_state_* — when the op does ≥ 2 writes; name what holds if a later write fails_
    _  edge_authority_*     — when the op checks permission/ownership; name allowed, denied, and over-grant boundaries_
    _  edge_boundary_*      — empty/null/duplicate/oversized/expired inputs that change behavior_
    _A happy-only `paths` for an op that fails, writes, or checks authority is NON-COMPLIANT._
    _Every error_/edge_ path MUST have a corresponding test (SCENARIO_ENUMERATION.md)_
    _UNLESS the path is genuinely improbable, in which case its last step is marked_
    _  "KNOWN-NOT-VALIDATED: <probability/why slim> — <why acceptable>"_
    _KNOWN-NOT-VALIDATED is ONLY for slim-probability edges — never for a realistic_
    _failure/authority/write path._
- `mermaid`: multiline_string _(optional; required when fn has ≥ 2 paths OR ≥ 3 collaborators)_

## mermaid_required

every flow ships a mermaid diagram of its path graph (in flows/<fn>.flow.md sibling, the flow yaml, or the feature spec.md) — enforced by scripts/verify/verify-api-first.mjs

## error_terminal

- `owns`: USER_JOURNEYS#journey-outcomes defines the terminal SHAPE (what_happened + why + what_next) and the alternative-only-when-a-real-recovery-exists rule. This section applies that shape at the per-flow-path level; it does not restate the fields or the recovery rule.
- `rule`: every error_* path REALIZES an explained_failure terminal — its last step is the user-facing explanation, and names the alternative flow when a real recovery exists (else "terminal — explanation suffices"). A well-explained error terminal is a legitimate END of a user journey, not a defect.
- `applies_to`: request-handler + service-method + composition-root flows that surface to a user. Pure predicates/helpers with no user-facing surface state the explanation at their nearest calling handler.
- `banned`: an error_* path whose terminal is a raw throw, an HTTP code with no user-facing message, or an undocumented stop — that is a journey step left unachieved, not covered.

## human_catalog

- `location`: docs/flows/ _(flat, top-level, human-walkable)_
- `index`: docs/flows/00-INDEX.md _(the whole sequence, one line per flow, in reading order)_
- `one_file_per_flow`: true _(exactly one .md per flow — never bundle flows into one file)_
- `filename`: "<FF>-<NNN>-<name>.md" _(e.g. AA-001-user-signup.md)_
- `filename_parts`:
  - `FF`: two-letter feature code (AA, BB, CC …), one per feature, assigned in build/dependency order so the alphabetical sort of filenames IS the intended reading order (foundations first)
  - `NNN`: zero-padded 3-digit flow ordinal WITHIN the feature (001, 002, …) — the number IS the flow order; do NOT also append a redundant "Flow-N"
  - `name`: short kebab summary of the flow
- `sort_gives_sequence`: sorting every filename yields the global walk — AA-001 → AA-002 → BB-001 → …
- `each_file_contains`:
  - "# <FF>-<NNN> — <Title>"
  - "What this flow does: one plain-English paragraph a non-engineer understands (no jargon, no code)"
  - "Feature: <name> (<FF>) · flow <N> of <total>"
  - "Machine contract: <path to the flows/<fn>.flow.yaml this narrates>"
- `rule`: every machine flow.yaml has exactly one catalog entry that links back to it; every catalog entry links to an existing flow.yaml (no orphans either direction)

## journey_completeness

- `rule`: the flow SET must let a user COMPLETE every user journey end-to-end. If any journey cannot be completed within the documented flows — a step in the journey maps to no flow — the flow set is INCOMPLETE, and an incomplete flow set is a DEFECT (not "add it later", not "out of scope").
- `journey`: an end-to-end user path through the product (e.g. sign-up → verify email → create first project → invite a teammate → …), spanning multiple flows; the authoritative journey list is the outside-in catalog owned by USER_JOURNEYS.md (docs/journeys/), modeled from the domain + peer apps, not transcribed from these flows
- `trace`: every journey step maps to exactly one flow (or a named path within a flow); the journey index (docs/journeys/00-INDEX.md) records the journey → flow(s) mapping so any uncovered step is visible
- `outcome_coverage`: a step is COVERED when its flow leads the user to `success` OR to a well-explained error terminal (error_terminal + USER_JOURNEYS#journey-outcomes) — reaching an explained failure IS journey achieved. A step whose only reachable outcome is a silent/unexplained stop is UNCOVERED.
- `blind_traversal`: over a reconciled set, USER_JOURNEYS#blind-traversal-audit runs the stronger self-sufficiency test — REPEATED down a priority order (most-likely / most-important / high-traffic goals first), each a domain-only goal traversed using ONLY docs/flows; both unreachable_goals AND priority_goals_uncovered must be 0
- `bidirectional`: completeness runs BOTH ways (owned by USER_JOURNEYS#reconciliation) — forward, every journey step maps to a flow (gap = missing capability); reverse, every flow maps to a journey (gap = orphan feature — HARD RED per USER_JOURNEYS#orphan-flow). A flow set with an orphan flow is non-compliant just as one with an uncovered step is.
- `banned`: declaring flows "done" while a real user journey has a step no flow covers, OR while a flow serves no journey — every per-flow contract being green does NOT make the SET complete
- `verdict`: '"Are the flows complete?" has EXACTLY TWO answers — nothing between them:'
- `verdict_yes`: 'YES — 100%: every journey step maps to a flow AND every flow maps to a journey. The user can complete EVERY journey using only these flows, and no flow exists that no journey needs.'
- `verdict_no`: 'NO: at least one journey step maps to no flow, OR at least one flow maps to no journey. Name the missing flow(s) / orphan flow(s). "Still have flows to create/reconcile" IS the NO answer.'
- `no_third_answer`: there is NO third answer. BANNED — "mostly", "nearly", "almost", "the important ones", "green per-flow so effectively done", any percentage other than 100, or any qualification that dresses a NO as a YES. One missing flow OR one orphan flow = the answer is NO. Full stop.
- `honesty`: answering YES while any journey step is uncovered or any flow is an orphan is a LIE (Precision & honesty + completion-claim rule). If you have not reconciled EVERY journey to a flow and EVERY flow to a journey, the answer is NO — never guess YES, never soften NO.
- `parallels`: the set-level analogue of the per-flow exhaustive-path rule (flow_yaml.paths) — a happy-only flow is non-compliant; a journey-incomplete OR orphan-carrying flow set is non-compliant

## e2e_realization

- `rule`: each flow is REALIZED as a set of E2E tests — every path the flow enumerates (happy + error_* + edge_*) becomes an E2E test case that drives the REAL surface (over the wire / through the browser) and asserts the persisted side-effect (E2E_TESTING.md + UNIT_COVERAGE#e2e-per-surface). "The flow is written" is NOT done; "the flow's E2E tests are green" is.
- `set_identity`: the COMPLETE E2E suite = the union of all flows' E2E tests — nothing more, nothing less. So a journey the flows cover end-to-end (journey_completeness) is, by construction, an E2E-tested journey end-to-end. A flow with no E2E test is incomplete; a journey-complete flow set yields a journey-complete E2E suite.
- `see`: E2E_TESTING.md (scenario/flow tree, placement, db-safety, run modes), UNIT_COVERAGE#e2e-per-surface (the a-feature-is-not-done-without-its-green-E2E gate)

## labs_realization

- `rule`: every flow is REALIZED as >= 1 labs surface — a flow-backed, mobile/PWA-first, full-real-estate view of the flow that the auto-play player can drive. The flow<->labs map is bidirectional and binary (LABS#flow-labs-mapping) — a flow with no labs surface AND a labs surface with no flow are both red.
- `extended_mermaid`: the flow's `mermaid:` path graph is the single origin the labs player reads — extended so each node/edge carries a UI binding (LABS#auto-walkthrough). The player's steps map 1:1 to the flow's paths; it never invents a step.
- `see`: LABS.md (surfaces, tiers, feedback protocol, player), verify-labs.mjs (the gate)

Last updated: 2026-07-25T15:22:50Z