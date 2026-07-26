# DIGEST for pm.md — GENERATED, do not edit. Regenerate: node ~/.claude/standards/scripts/generate/generate-agent-digests.mjs
# sources:
#   PROCESS_DISCIPLINE.md 00fde02af7d3a86a
#   WRITING_ORDER.md d092e17c59f16073
#   VERIFIER_MODES.md 4398d7072b02f375
#   DECISION_LOG.md 6e66ab4cda731377
#   API_ENVELOPE.md c5c9c462f3c0ed0f
#   API_FIRST.md 1472d0ced6c98f2f
#   REQUIREMENTS_CONTRACT.md bb3a594c82f86723
#   USER_JOURNEYS.md 2e613c2fe2bbc2f9
#   CONTEXT_ECONOMY.md bb97a1b65cb56163

## ═══ PROCESS_DISCIPLINE.md ═══

```markdown
# PROCESS_DISCIPLINE

> ---------- scope discipline ----------

```meta
version: 1
last_updated: 2026-05-20T20:00:00Z
```

## scope

- `rule`: code ONLY what's asked
- `no_dead_code`: every symbol added in this slice MUST have a caller in this slice
- `no_anticipation`: forbidden to add code "for a future slice"; if unsure → surface and wait

## defects

- `rule`: surface defects, NEVER fix silently
- `on_real_defect_outside_scope`: 1: STOP 2: surface (a) the defect, (b) the trigger, (c) proposed fix, (d) "fix now or accept-and-flag?" 3: wait for the user's call
- `banned`:
  - `silent_fix`: scope violation
  - `silent_acceptance`: false confidence claim
- `categories`:
  - atomicity gap
  - TOCTOU race
  - unhandled error
  - missing constraint
  - partial-state failure mode
  - security hole

## order

- `rule`: foundational order — build dependencies BEFORE dependents (bottom-up)
- `examples`:
  - schema before service
  - service before action
  - action before UI
  - catalog / contract / scope before consumers
- `forbidden`: starting a surface layer while its foundation is unsettled
- `stub_exception`: upper-layer stub allowed ONLY when explicitly authorized; never unprompted

## db_hygiene

- `rule`: end-of-turn state matches start-of-turn state (or the agreed-upon target shape)
- `during_work_allowed`: migrations, seeds, data mutations as part of the task
- `banned`:
  - rogue rows left behind
  - half-applied migrations
  - test data leaked into the working DB
- `cleanup`: roll back what was run; remove what was inserted; restore to the agreed shape

## decisions

- `zero_executive_decisions`: true
- `rule`: never decide on the user's behalf
- `applies_to`:
  - tech / library / pattern / scope / approach / design choice
- `on_uncertainty`: ASK
- `on_exhausted_options`: ASK before deviating

## pushback

- `rule`: never agree by reflex; push back when wrong
- `treatment_of_user`: equal — not subordinate
- `banned`:
  - '"you''re right" without verification'
  - '"this will take too long" — take the scope as given'
- `required_when_disagreeing`: 1: state the disagreement 2: cite the specific rule or fact 3: propose an alternative 4: wait for the user's call

## pr_scope

- `rule`: one bug = one fix = one PR
- `also`: one feature = one slice = one PR (or one continuous-branch slice of a large feature)
- `banned`: bundling unrelated changes into a single PR

## refactor_to_testability

- `rule`: untestable code is a design smell, not a testing problem
- `on_hard_to_test`: 1: refactor — inject the hidden dependency (clock, fetch, rng, env, fs) as an interface 2: NEVER skip the test 3: NEVER mock the world around an unchanged function
- `see`: UNIT_COVERAGE.md for the full coverage rule

Last updated: 2026-05-20T20:00:00Z
```

## ═══ WRITING_ORDER.md ═══

```markdown
# WRITING_ORDER

> agent needs to APPLY and ENFORCE: the three-phase writing order (spec → code → verify), the drive-to-green loop,
editing a locked feature, the coverage bar, scope authority, and standards-change authority. The lock file the verify
phase stamps: LOCK_FILES.md. ---------- product-level journey phase (precedes every feature) ---------- The circular
journey↔flow loop (USER_JOURNEYS.md) runs at PRODUCT level BEFORE any per-feature writing order below. Journeys + the
flows that satisfy them exist as a reconciled map before a line of code is written.

```meta
version: 1
last_updated: 2026-07-19T16:43:58Z
```

## journey_phase

- `owner`: pm _(orchestrates the loop; dispatches journey-cartographer-core for blind discover)_
- `precedes`: writing_order _(no feature spec_phase starts before journeys are reconciled to flows)_
- `loop`: USER_JOURNEYS#journey-loop _(discover (blind) → match → reconcile → update)_
- `output`: docs/journeys/{J-<NNN>-<slug>.md, 00-INDEX.md}
- `gate_before_features`: docs/journeys/00-INDEX.md shows every journey step mapped to a flow AND no orphan flow (USER_JOURNEYS#reconciliation verdict = YES); feeds the user-locked requirements (REQUIREMENTS_CONTRACT.md) that the writing_order below derives from

## writing_order

- `spec_phase`:
  - `owner`: feature-spec-writer
  - `output`: __specs__/{spec.yaml, spec.md, flows/, manual/ for EVERY HTTP|UI surface (mandatory; never omitted), ui/ if UI surface, openapi.yaml if HTTP, asyncapi.yaml if events}
  - `hands_off_to`: coder
  - `steps`: 1: write __specs__/spec.yaml AND __specs__/spec.md 2: write __specs__/flows/<fn>.flow.yaml for every
    exported function 3: write __specs__/openapi.yaml if invocation.type=http 4: write __specs__/asyncapi.yaml if
    folder emits/subscribes events 5: 'write __specs__/manual/<flow>.md for EVERY HTTP / CLI / UI surface — MANDATORY,
    never skipped. A RUNNABLE adversarial flow (copy-paste into the Claude Code Chrome extension; drives the surface,
    POSTs results to /api/v1/manual-results/<flow>, prints them), NOT a copy of flows/ or the tests. Markdown only;
    five sections (Target/Preconditions/Steps/Assertions/Report); >= 1 "MUST NOT" assertion. NO automated-complete
    escape hatch, NO .yaml form — "tests already cover it" is non-compliant; an absent flow for a callable surface is
    non-compliant. See MANUAL_FLOWS#manual-md + MANUAL_FLOWS#manual-flow-surfaces.' 6: 'write __specs__/ui/<flow>.md
    if invocation.type in (ui, server-action) AND spec.yaml.ui_design != not-applicable; route to user for sign-off;
    user inserts `<!-- ui-locked: YYYY-MM-DD -->` marker in each file after approving (spec-writer NEVER self-signs)'
    7: drop __specs__/ui/<flow>.design-<state>.png for every state declared in <flow>.md (one PNG per state); user
    exports from any design tool and commits; filename convention is the contract
  - `blocks_coder_phase_until`:
    Path 1: every required __specs__/ui/<flow>.md carries `<!-- ui-locked: YYYY-MM-DD -->` (enforced by verify-ui-design-locked.mjs). Coder phase cannot start without this.
    Path 2 is checked at verify-phase: every required __specs__/ui/<flow>.design-<state>.png scores ≥ ui_screenshot_match_threshold against the Puppeteer screenshot of the matching state (enforced by verify-ui-screenshots-match-designs.mjs). Verifier Mode A cannot stamp the lock without this.
    Features with spec.yaml.ui_design: not-applicable skip BOTH paths; a one-line reason in spec.md is required.
- `code_phase`:
  - `owner`: coder
  - `output`: source + __tests__/ (red/green TDD with targeted runs allowed)
  - `dialogue_required_with`: feature-spec-writer (when spec is unclear / contradictory / suboptimal)
  - `hands_off_to`: verifier
  - `steps`: 1: write the code (driven by the specs) 2: add JSDoc on every exported function (1-3 lines; detail lives in spec) 3: write __tests__/<code>.test.ts — 100% coverage required (perFile) 4: run targeted `pnpm vitest run <slice-path>` for red/green TDD; NEVER run full verify chain
- `verify_phase`:
  - `owner`: verifier
  - `mode`: A _(semantics: LOCK_FILES#verifier-modes)_
  - `output`: __specs__/standards-compliance.yaml stamped on green (status:locked, verified:100%, last_validated:<utc-now>) per LOCK_FILES#schema
  - `on_green`: orchestrator may tag compliant/<sha> (see LOCK_FILES#compliant-tag)
  - `on_fail`: drive-to-green loop (see verify_phase_drive_to_green)

- `verify_phase_drive_to_green`:
  - `owner`: orchestrator (Claude Code session OR pm agent OR verifier-core dispatcher)
  - `max_attempts`: 5
  - `behavior`:
    - `on_fail_attempt_lt_max`:
      1. capture verifier's reproduction block verbatim
      2. capture attempt counter (N of MAX)
      3. re-dispatch coder with reproduction + counter
      4. coder iterates source/tests to address EVERY failure in the reproduction
      5. re-dispatch verifier Mode A
      6. increment attempt counter; reset on green
    - `on_fail_attempt_eq_max`:
      SURFACE to user — do not iterate further. Surface contents:
      - all 5 attempts' verifier reproduction blocks (verbatim)
      - all 5 attempts' coder change-summary (file paths + 1-line per change)
      - the unchanging root cause (best-guess from the orchestrator)
      - ask: "spec gap? environmental issue? human design call needed?"
    - `on_green`: stamp + proceed per writing_order.verify_phase
  - `counters`: per-slice (per branch + per feature-path); reset on green; reset on user-triggered "start over"
  - `forbidden`:
    - skipping any verifier output between attempts (never paraphrase the reproduction to the coder)
    - swallowing FAIL silently (the user MUST see attempt 5 surface)
    - bumping max_attempts past 5 without user authorization

## editing_locked

- `shape`: same three phases as writing_order (spec_phase → code_phase → verify_phase)
- `spec_phase_start`: set standards-compliance.yaml status=unlocked
- `steps`: 1: set status=unlocked 2: feature-spec-writer updates __specs__/spec.yaml + __specs__/spec.md + flows/ +
  manual/ 3: coder updates source + __tests__/ (100% maintained) 4: verifier Mode A re-runs targeted gates on the
  slice + blast radius 5: verifier re-stamps standards-compliance.yaml (status=locked, last_validated=<now-utc>) on
  green 6: orchestrator commits; emits new compliant/<sha> tag on green Mode D (see LOCK_FILES#compliant-tag)

## forbidden

- editing code before updating the spec
- coder silently deviating from the spec
- coder running pnpm verify / typecheck / lint / coverage as a release gate
- skipping verifier Mode A on a slice
- bumping last_validated without a real walk

## test_coverage

- `threshold`: 100% _(lines / branches / functions / statements)_
- `cant_reach_100_percent`: split the file or refactor for testability
- `skip_exception`: physically or mathematically impossible only
- `banned_excuses`:
  - too long
  - too many tests required
  - improbable

## spec_yaml_scope_authority

- `rule`: optional spec.yaml field; one of {user, claude}; default "user"
- `when_claude`:
  - `coder_may_decide_without_asking`:
    - helper extraction (private functions inside the feature folder)
    - internal field/column naming within the operation's domain
    - test fixture choice (placeholder names from CLAUDE.md "Placeholder names" convention)
    - log-key naming
    - private type-alias naming
  - `coder_must_still_surface`:
    - invocation.type changes
    - public API shapes (request_schema / response_schema)
    - permission slugs
    - data destruction (DROP/DELETE/TRUNCATE)
    - third-party API choice
    - library / framework choice
    - any spec edit that alters behavior visible to a caller
- `default_user_behavior`: surface every in-scope decision per CLAUDE.md "Do exactly what is asked"
- `enforced_by`: coder agent reads the field at code-phase start; enum validation lives inline in the coder + spec-writer SOPs

## standards_change_authority

- `rule`: standards changes (any edit to ~/.claude/CLAUDE.md or ~/.claude/standards/*) always surface to the user for explicit approval; the agent never auto-patches standards mid-slice — not even for one-paragraph doc clarifications
- `applies_to`: ~/.claude/CLAUDE.md + ~/.claude/standards/*.{yaml,md,detail.md} + vendored copies
- `procedure`: 1: surface the proposed change verbatim in the end-of-turn report 2: user explicitly approves before the edit lands 3: standards changes ship in their own focused PR, never bundled into a feature slice

Last updated: 2026-07-19T16:43:58Z
```

## ═══ VERIFIER_MODES.md ═══

```markdown
# VERIFIER_MODES

> Scope: THE full 15-mode verifier catalog — SINGLE OWNER. No other file carries the catalog. LOCK_FILES.md owns the
semantics of the core modes (A/B/C/D/E) and cites this file for the catalog. Also owns the final-push / about-to-merge
mode-selection prompt. Siblings: ISSUES.md, BRANCHES_AND_COMMITS.md, PULL_REQUESTS.md, REPO_GATE_INSTALLATION.md (the
hooks that invoke these modes). ---------- verifier mode catalog (15 modes — SINGLE OWNER) ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## verifier_modes

- `layers`:
  - `timestamp_ops`: letters A–F — read or write the `status:` / `last_validated:` fields on `__specs__/standards-compliance.yaml`
  - `heavy_proof`: named modes — actually execute code gates (typecheck, build, lint, unit, e2e)
  - `deep_ceremony`: named modes — unlock → Pristine + Compliance per feature → relock + checklist
- `lock_state_machine`: 'every `__specs__/standards-compliance.yaml` carries `status: locked | unlocked`; Mode A flips to unlocked at start, runs gates, flips back to locked with fresh last_validated on pass; interrupt mid-gates → stays unlocked (signal: slice not re-validated); Modes B / B.5 / D / F / F-Random refuse to validate any unlocked slice'
- `timestamp_modes`:
  - `mode_a`: { action: update, scope: one slice (this commit), gates: scoped Pristine + lock-shape (refuses to stamp on failure) }
  - `mode_b`: { action: validate, scope: HEAD only, read_only: true }
  - `mode_b5`: { action: validate, scope: uncommitted working tree (staged + unstaged), read_only: true }
  - `mode_c`: { action: update, scope: this branch (origin/main..HEAD), implementation: fans Mode A across every slice }
  - `mode_d`: { action: validate, scope: this branch (origin/main..HEAD), read_only: true }
  - `mode_e`: { action: update, scope: entire repo, implementation: fans Mode A across every slice }
  - `mode_f`: { action: validate, scope: entire repo, read_only: true }
  - `mode_f_random`: { action: validate, scope: random ~20% of repo, read_only: true }
- `heavy_proof_modes`:
  - `mode_pristine`: typecheck + build + lint + unit tests + e2e tests
  - `mode_compliance`: the 11-script compliance chain (specs/flows/manuals/lock-files/source-coverage/freshness/RULE 0 boundaries/UI gates)
  - `mode_pristine_and_compliance`: Pristine then Compliance — the pre-merge gate (manual, on-demand)
- `deep_ceremony_modes`:
  - `mode_verify_all`: feature-by-feature deep ceremony with checklist; hours-long; manual
  - `mode_verify_all_random`: same as verify-all on random ~20% feature subset
- `inspection_maintenance_modes`:
  - `mode_inspect`: read-only walk of every lock — status + last_validated + freshness; no execution
  - `mode_cleanup_orphans`: detect orphan lock files + dead catalog entries; report-only by default

## final_push_gate

- `owner`: PM agent (when present) OR developer-invoked directly
- `prompt`: "Last full verify was {N} ago. Pick: (B) HEAD stamp check; (D) branch stamp check; (Pristine+Compliance) full code gates; (Verify-All) deep ceremony."
- `modes`:
  - `B`: HEAD-only stamp check
  - `D`: branch (origin/main..HEAD) stamp check Pristine+Compliance: full code gates on every slice + 11-script compliance chain (no per-slice unlock/relock)
  - `Verify-All`: feature-by-feature deep ceremony (unlock → Pristine + Compliance → relock); hours-long
- `house_clean_trigger`:
  - `commits_since_last_verify_all`: 25
  - `days_since_last_verify_all`: 7
  - `behaviour`: prompt fires regardless of developer intent when either threshold is hit
- `exit_required`: 0 from the chosen mode
- `see`: AGENT_ARCHITECTURE.md _(full lifecycle spec)_

Last updated: 2026-07-12T00:00:00Z
```

## ═══ DECISION_LOG.md ═══

```markdown
# DECISION_LOG

> Decisions the user has ruled on are LOGGED and never re-asked.

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## locations

- `global`: ~/.claude/decisions/DECISIONS.yaml _(rulings that apply across all projects)_
- `per_repo`: <repo>/docs/decisions/DECISIONS.yaml _(rulings scoped to one project)_

## entry_schema

- `date`: iso8601_date _(when the ruling was made)_
- `scope`: enum[global, repo]
- `decision`: one-sentence statement of the ruling, in the user's terms
- `context`: one line — what prompted the question
- `source`: enum[user] _(only the user creates decisions)_

## rules

- `append_same_turn`: every user ruling (an AskUserQuestion answer, an explicit "do X not Y", a preference, a scope call) is appended to the correct log IN THE SAME TURN it is given
- `consult_before_asking`: before asking the user ANY question, grep both logs; a question already answered there is NEVER asked again — cite the entry and proceed
- `log_beats_memory`: the log is the source of truth for past rulings; session memory and recollection never override it
- `never_edit_rulings`: entries are append-only; a ruling changes only when the user gives a new ruling (append the new entry; the newest entry for a topic wins)
- `no_silent_downscoping`: a directive is executed WHOLE — never silently reduced to the least-destructive subset; if a step looks destructive or wrong, SAY SO and ask (after consulting the log), never quietly skip it

## enforcement

- `pre_ask_hook`: ~/.claude/hooks/decision-log-guard.mjs _(PreToolUse on AskUserQuestion — injects both logs + the never-re-ask directive into context before any question reaches the user)_
- `tier_1`: CLAUDE.md + STANDARDS_ENTRY.md carry the consult-before-asking + append-same-turn rules

Last updated: 2026-07-12T00:00:00Z
```

## ═══ API_ENVELOPE.md ═══

```markdown
# API_ENVELOPE

> Every API response on every site uses ONE envelope — success and error alike, always with the correct HTTP status. Features change; the pattern never does. Base: JSend (the widely adopted status/data envelope), extended with the house error-code shape. RFC 9457 problem+json is NOT used — it covers only errors and switches media type, breaking envelope uniformity.

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## envelope

- `media_type`: application/json _(every response, including errors)_
- `success`: _(HTTP 2xx)_
  - `shape`: '{ "status": "success", "data": <payload | null> }'
  - `data`: the actual resource/result; null when the operation returns nothing
- `fail`: _(HTTP 4xx — caller problem (validation, auth, not-found, conflict))_
  - `shape`: '{ "status": "fail", "code": "<ERROR_CODE>", "message": "<human line>", "data": <field-errors | null> }'
- `error`: _(HTTP 5xx — server problem)_
  - `shape`: '{ "status": "error", "code": "<ERROR_CODE>", "message": "<human line>" }'
  - `never_leaks`: stack traces, SQL, internal paths — code + generic message only

## rules

- `no_endpoint_exempt`: every route handler returns the envelope — including 401/403/404/500, middleware rejections, and thrown-error catch-alls
- `http_status_always_correct`: the envelope NEVER substitutes for the right HTTP status; status field and HTTP status agree (success<->2xx, fail<->4xx, error<->5xx)
- `code_shape`: fail/error code follows NAMING.md error-code format; codes are stable API contract values documented in the feature's openapi.yaml
- `single_helper`: one shared respond() helper per repo builds the envelope; handlers never hand-assemble it (drift-proof)
- `openapi_documents_envelope`: every operation's responses in openapi.yaml show the envelope for every declared status

Last updated: 2026-07-12T00:00:00Z
```

## ═══ API_FIRST.md ═══

```markdown
# API_FIRST

> The website IS the API; UI is its first client. Every user capability ships as an API before any user-facing UI exists — so any future client (mobile, console, AI agent) drives the identical services.

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## ordering

_per site, strictly in this order_ 1_services_as_apis: every user capability is a service exposed via an HTTP API
(API_SURFACE.md parity; API_ENVELOPE.md response shape; AUTHORIZATION gating) 2_flows_immediately: the moment an API
lands, its flows are written — the most probable scenarios any user will face (FLOW_CONTRACT.md; mermaid diagram each)
3_e2e_every_flow: every flow gets a real E2E test through the actual transport (E2E_TESTING.md api variants) —
validated, gaps closed, tightened 4_mechanical_complete: the site is 100% functional with ZERO UI — everything a user
can do is achievable via APIs alone, proven by the attestation below 5_then_ui: page-tier UI starts ONLY after the
attestation is locked

## exemption

- `design_library`: atomics/composites (the design system) may be built ANY time — same exemption SITE_BLUEPRINT grants; user-facing pages/routes are what wait

## attestation

- `file`: docs/site/MECHANICAL_COMPLETE.yaml
- `shape`:
  - `marker`: "mechanical-complete: <YYYY-MM-DD> by:(user|agent)"
  - `flows`: map of every flow stem (every flows/*.flow.yaml in the repo) to its e2e contract path (e2e/<scenario>/<flow>/<flow>.yaml) — none omitted
- `gate`: scripts/verify/verify-api-first.mjs — page-tier source is REFUSED until the attestation exists, carries the marker, maps EVERY flow stem, every cited e2e path exists, and every flow has a mermaid diagram

## why_it_binds

any client — a different UI, a native app, an AI — consumes the same endpoints; user management, subscriptions, everything is API-reachable forever

Last updated: 2026-07-12T00:00:00Z
```

## ═══ REQUIREMENTS_CONTRACT.md ═══

```markdown
# REQUIREMENTS_CONTRACT

> Autonomous building happens ONLY against requirements finalized with the user and locked. Sessions help by building exactly what was agreed — never by guessing, never by silently deciding on the user's behalf.

```meta
version: 1
last_updated: 2026-07-19T16:43:58Z
```

## requirements_phase

- `where`: docs/requirements/REQUIREMENTS.md (+ REQUIREMENTS.yaml when machine fields help)
- `how`: produced WITH the user (brainstorm → draft → user edits → final)
- `outside_in_input`: the user-journey catalog (USER_JOURNEYS.md, docs/journeys/) is the outside-in evidence that shapes requirements — journeys are discovered from the SaaS domain + peer apps BEFORE requirements are drafted, so the capabilities below answer real arriving-user intent, not internal guesswork. Journeys FEED requirements; they never replace them (the user still locks).
- `lock`: "<!-- requirements-locked: YYYY-MM-DD by:user -->" _(ONLY the user locks requirements)_
- `contents`: what the app is, every capability (each becomes an API per API_FIRST.md), actors + gating, out-of-scope list, and the acceptance bar

## autonomous_build

- `starts`: only when the lock marker exists
- `derivation_order`: requirements → journeys (USER_JOURNEYS.md) → standards → decision logs → ask _(never invent)_
- `stop_conditions`: _(the ONLY reasons a session stops)_
  - ALL DONE — every gate green, locks stamped, 100%-standards-met push
  - a question ONLY the user can answer (not derivable from requirements/standards/decisions)
  - an assumption the session is about to make that could CONTRADICT locked requirements or standards — surface it BEFORE building on it
- `no_executive_decisions`: scope, tech beyond STACK.md, product behavior, and anything the requirements are silent on that changes what the user gets — user-owned, always

## assumption_ledger

- `file`: docs/requirements/ASSUMPTIONS.yaml _(append-only, like the decision log)_
- `entry`: { date, assumption, derived_from: <requirements/standards/decision citation> }
- `rule`: every assumption made mid-build is WRITTEN with its derivation BEFORE code relies on it; an assumption with no derivable citation is a stop-condition, not an entry
- `why`: bad assumptions surface in days at review of the ledger — not months later in code

## enforced_by

scripts/verify/verify-requirements.mjs _(shipping repo with features but no user-locked requirements = red)_

Last updated: 2026-07-19T16:43:58Z
```

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
```

## ═══ CONTEXT_ECONOMY.md ═══

```markdown
# CONTEXT_ECONOMY

> Context is a budget, not a landfill. Standards-following must get CHEAPER over time, never heavier.

```meta
version: 1
last_updated: 2026-07-25T15:22:50Z
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

Last updated: 2026-07-25T15:22:50Z
```
