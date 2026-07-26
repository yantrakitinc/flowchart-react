# DIGEST for journey-cartographer-core.md — GENERATED, do not edit. Regenerate: node ~/.claude/standards/scripts/generate/generate-agent-digests.mjs
# sources:
#   USER_JOURNEYS.md 50f91eded22e562e
#   FLOW_CONTRACT.md bd894c75b1bb108a
#   CONTEXT_ECONOMY.md 7937af1a8307570f
#   NAMING.md d1b0e4ffa6aad9e0

## ═══ USER_JOURNEYS.md ═══

```markdown
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
- `coverage`: journey_completeness counts an explained_failure terminal as valid coverage of a step — a step is covered when a flow leads the user to `success` OR to an explained_failure terminal (FLOW_CONTRACT#flow-md + FLOW_CONTRACT#error-terminal), and NEVER when it leads to an unexplained stop

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
  - `reads_only`: [docs/flows/] _(the human flow catalog + the flows/<fn>.flow.md it links — NO code, NO journeys, NO other specs)_
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
- `enforced_by`: scripts/verify/verify-outside-in.mjs --check journeys _(requires the blind-traversal index + both terminal lines at 0 once features exist)_

## feeds

- `requirements`: journeys are the outside-in INPUT that shapes docs/requirements/REQUIREMENTS.md; the user still locks REQUIREMENTS (REQUIREMENTS_CONTRACT.md) — journeys inform it, never replace it
- `flow_completeness`: this catalog IS the authoritative journey list that FLOW_CONTRACT#journey-completeness traces against
- `blueprint`: SITE_BLUEPRINT.md coverage matrix cites journeys; unmapped_journeys must be 0
- `blind_traversal`: docs/journeys/blind-traversal/00-INDEX.md carries the audit's terminal unreachable_goals + priority_goals_uncovered data lines (both must be 0), read by the same gate (blind_traversal_audit) — the audit is repeated down the priority order until both are 0

## enforced_by

scripts/verify/verify-outside-in.mjs --check journeys _(missing 00-INDEX, missing provenance, any unmapped)_

    _journey / orphan flow, or unreachable_goals > 0 = red_

Last updated: 2026-07-25T15:22:50Z
```

## ═══ FLOW_CONTRACT.md ═══

```markdown
# FLOW_CONTRACT

> Scope: the flows/<fn>.flow.md contract — the 17-key schema and the exhaustive path-enumeration doctrine (happy /
error_* / edge_* + KNOWN-NOT-VALIDATED). Siblings: SPEC_CONTRACT.md (__specs__/ layout + spec schemas),
MANUAL_FLOWS.md (manual/<flow>.md), AGENT_AFFORDANCES.md. ---------- flow.md schema ---------- A flow doc
ENUMERATES EVERY PATH the function can take — happy, every error, every edge — so implementation + tests derive from a
complete behavior map. An incomplete flow IS a defect. A happy-path-only flow for an operation that can fail, writes
data, or checks authority is NON-COMPLIANT — do not stub it. The schema below is authored inside the flow doc's FIRST
fenced ```yaml block (the loader reads that block; legacy `.flow.md` still read for backward compatibility).

```meta
version: 1
last_updated: 2026-07-26T00:00:00Z
```

## flow_md

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
- `spec`: path _(path to this folder's spec.md)_
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

every flow ships a mermaid diagram of its path graph (in the flow doc's `mermaid:` field or the feature spec.md) — enforced by scripts/verify/verify-outside-in.mjs --check api-first

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
  - "Machine contract: <path to the flows/<fn>.flow.md this narrates>"
- `rule`: every machine flow doc has exactly one catalog entry that links back to it; every catalog entry links to an existing flow doc (no orphans either direction)

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
- `see`: LABS.md (surfaces, tiers, feedback protocol, player), scripts/verify/verify-outside-in.mjs --check labs (the gate)

Last updated: 2026-07-26T00:00:00Z
```

## ═══ CONTEXT_ECONOMY.md ═══

```markdown
# CONTEXT_ECONOMY

> Context is a budget, not a landfill. Standards-following must get CHEAPER over time, never heavier.

```meta
version: 1
last_updated: 2026-07-26T00:00:00Z
```

## session_injection

- `budget`: 6000 _(chars, TOTAL additionalContext from the SessionStart hook)_
- `composition`: contract (fixed) + catalog (names only) + open lessons (open only) + failures (only when failing)
- `rule`: scopes/rules/details are ONE READ away (INDEX.yaml -> <NAME>.yaml) — never injected wholesale
- `enforced_by`: scripts/verify-standards-meta.mjs _(check 11 pipe-runs the hook and fails over budget)_

## agent_economy

- `read_scope`: an agent reads ONLY the standards in its standards_used list (+ INDEX for routing) — never sweeps the tree
- `output_contract`: strict verbatim-lines-only report formats with hard line caps — transcripts, file dumps, and narration never return to the orchestrator
- `model_fit`: haiku for mechanical run-and-quote work; sonnet only where judgment is the job
- `dispatch_rule`: one focused brief in, one capped report out; follow-ups via SendMessage to the same agent instead of re-briefing a new one
- `offload_rule`: token-heavy transient work (multi-file reads, wide searches, gate/test transcripts, open-ended
  investigation) MAY be dispatched to a pinned-cheap agent when the offload genuinely nets a saving — but only after
  the cheaper inline remedies (dispatch_discipline.prefer_inline) are exhausted. Dispatch is not the default reflex;
  it is the move when inline can no longer keep the loop lean.
- `offload_enforced_by`: hooks/context-bloat-guard.mjs _(PostToolUse: nudges when an inline)_
  _read/search/gate burst crosses the char threshold; leads with inline-summarize/trim, offload second;_
  _resets on subagent dispatch. Advisory (never blocks the tool). Disable with CONTEXT_BLOAT_GUARD=off._

## dispatch_discipline

- `default`: inline — Claude Code does the work in-session by reading the relevant <agent>.md as SOP
- `self_adjudicated`: the session decides whether a dispatch clears the bar; it NEVER prompts the user for per-dispatch approval. In autonomous runs the same self-gate applies with no user in the loop.
- `prefer_inline`: _(before dispatching ANY agent, exhaust the cheaper remedies first)_
  - summarize the finding inline and drop the raw output from working context
  - drop stale / no-longer-needed context rather than moving fresh work out
  - narrow the read (fewer files, tighter grep, targeted line ranges) so it never bloats
- `dispatch_only_when`: _(only after prefer_inline is exhausted AND at least one holds)_
  - `net_saving_offload`: the transient work is heavy enough that a subagent absorbing it (returning a capped report) saves more main-loop tokens across the remaining session than the subagent costs
  - `isolation_required`: parallel file mutation that would conflict inline (worktree)
  - `fresh_context_required`: a reproducibility / repo-blind exercise that must NOT see current context
  - `genuinely_bulk`: "more than 5 near-identical targets where clean capped output materially beats inline"
  - `heavy_verifier`: verifier Mode C / D
- `teams_effectively_never`: a multi-agent team (2+ full-context teammates) is the ~7x case — dispatch one ONLY when the task cannot be done any other way, with an explicit one-line justification. A team for speed or tidiness alone is NON-COMPLIANT.
- `justify`: every dispatch states in one line which dispatch_only_when case it clears and why inline is genuinely worse — a discipline the session applies to itself, recorded in its own reasoning, not a user-facing permission request
- `cheapest_model`: pick the cheapest model that fits (haiku for mechanical; sonnet only where judgment is the job) — model_fit still applies on top of the dispatch decision

## ledgers

- `injection`: decisions inject at question-time only (pre-ask hook); lessons inject open-only; terminated entries live on disk, not in context

## handoff_checkpoints

- `law`: a long or context-heavy session must not let its state die in an uncontrolled compaction. It checkpoints to `docs/handoffs/HANDOFF.md` — a small, forward-looking launchpad a FRESH session boots from — instead of carrying (or `--resume`-ing) accumulated bloat. Continuous work is a chain of bounded sessions stitched by handoffs, not one immortal session.
- `when`: on user command; "every so often" during long runs (per milestone / at a context-size nudge); and automatically before a forced stop — the PreCompact boundary (hooks/handoff-precompact.mjs nudges it), budget ceiling, or error spike.
- `pickup`: a new session opening in a repo with a handoff auto-surfaces it at SessionStart (hooks/handoff-pickup.mjs) and resumes from `## START HERE` — after verifying its claims against git; a stale handoff is refreshed, not trusted blindly.
- `boundary`: the handoff holds the forward map only (START HERE / Queue / In flight / Blockers / Done) — NOT history (git owns that) and NOT decisions (DECISIONS.yaml owns those, logged the same turn).
- `procedure`: the write-handoff skill owns HOW (shape, cadence, rules); this section is the law it complies with.

Last updated: 2026-07-26T00:00:00Z
```

## ═══ NAMING.md ═══

```markdown
# NAMING

> Rationale for every rule: NAMING.rationale.md. ---------- naming ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## naming

- `interfaces_and_types`: prefix `i` _(iUser)_
- `classes`: suffix `Class` _(AuthServiceClass)_
- `constants_literal`: ALL_CAPS _(MAX_LOGIN_ATTEMPTS)_
- `files`:
  - `components`: PascalCase _(LoginForm.tsx)_
  - `utilities_services_hooks`: camelCase or dot-case _(auth.service.ts, useSession.ts)_
- `primary_keys`: CUID2 (@paralleldrive/cuid2)
- `error_codes`: "{CATEGORY}_{FEATURE}_{ERROR}" _(≥ 3 ALL_CAPS segments)_
- `data_testid`: <feature>-<element>-<type> _(≥ 3 kebab-case segments)_
- `see_also`: AGENT_AFFORDANCES.md (data-agent-action verb catalog)

## verification

see LOCK_FILES.md

Last updated: 2026-07-12T00:00:00Z
```
