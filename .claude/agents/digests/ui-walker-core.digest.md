# DIGEST for ui-walker-core.md — GENERATED, do not edit. Regenerate: node ~/.claude/standards/scripts/generate/generate-agent-digests.mjs
# sources:
#   BROWSER_VALIDATION.md 023e095fbe9bcce7
#   MANUAL_FLOWS.md 70db861630e91257
#   VERIFY_MANUAL_STORIES.md c521091c649878f7
#   STORYBOOK_TESTING.md 9bea74cec8839acf
#   CONTEXT_ECONOMY.md bb97a1b65cb56163

## ═══ BROWSER_VALIDATION.md ═══

```markdown
# BROWSER_VALIDATION

> Wherever UI is available and touched, the UI is validated IN A REAL BROWSER (Claude Code Chrome extension) before the slice is done. Tests alone never substitute for driving the rendered surface.

```meta
version: 1
last_updated: 2026-07-16T00:00:00Z
```

## trigger

- `rule`: a slice TOUCHES UI when it creates or edits any component/composite/page source, story, or UI-bearing feature file (.tsx render surface, __stories__/, app routes)
- `consequence`: the slice is NOT done — and Mode A cannot stamp its lock — until the browser walk below is green

## what_runs

_content owners cited; this standard binds them_

- `manual_flows`: every __specs__/manual/<flow>.md for the touched surface is executed in Chrome via the extension, spec-derived and code-blind (MANUAL_FLOWS.md)
- `storybook_two_way`: every control + callback of touched components exercised on the Playground story via the extension (STORYBOOK_TESTING.md)
- `verify_manual_story`: the component's Verify-Manual runbook is followed; verdict + findings recorded through the Master page form (VERIFY_MANUAL_STORIES.md)
- `e2e_ui_variants`: touched cross-feature journeys run their ui variant through the real browser (E2E_TESTING.md)
- `interaction_gated_surfaces`: every modal / menu / accordion / drawer the touched surface owns is OPENED and asserted — unopened surfaces are unvalidated surfaces

## dispatch

- `walker`: ~/.claude/agents/ui-walker-core.md _(dispatchable walk; the active session may also walk inline)_

## evidence

- `results_record_required`: for every manual/<flow>.md the feature ships, a record at <repo>/manual-results/<flow>.<iso8601>.json no older than 60 min before browser_validated — checked by verify-standards-compliance alongside the stamp
- `walk_receipt_signed`: each record is a WALKER-SIGNED receipt (scripts/verify/_walker-receipt.mjs) — an HMAC
  signature over {flow, nonce, walkedAt, ok, observed} using a machine-local key (~/.claude/.walker-signing-key,
  git-ignored). Tamper-evident (editing any signed field breaks the signature) + path-bound (produced by the walker
  signing routine). NOT proof a browser rendered — a walker-signed receipt raises the forgery cost; extension-emitted
  receipts are the unbuilt ceiling. The walker signs ok:true ONLY on a genuine green walk (ui-walker-core.md step 6).
- `lock_stamp`: the feature's standards-compliance.yaml carries browser_validated:<ISO-8601-UTC>, stamped by verifier Mode A ONLY after the walk is green (LOCK_FILES#schema)
- `results_record`: verdicts persist via POST /api/v1/manual-results/<flow> (MANUAL_FLOWS.md per-app surfaces)
- `ci_split`: walk records are LOCAL evidence (git-ignored) — the record check runs on local machines only; CI validates the committed stamps/locks (browser walks cannot run in CI)
- `no_walk_no_stamp`: a UI-bearing feature's lock without browser_validated fails verify-standards-compliance — mechanically, every verify chain run

## not_required_when

- the repo declares ui_discipline:none (.standards/autonomy.yaml)
- the feature ships no UI surface (no .tsx render surface, no stories, no routes)

## enforced_by

scripts/verify/verify-standards-compliance.mjs _(browser_validated stamp + record existence/freshness on UI-bearing features)_

## record_content_gate

scripts/verify/verify-browser-validation-receipt.mjs _(record CONTENT — the newest manual-results record must be a real walk (ok:true + findings), not a stub)_

Last updated: 2026-07-16T00:00:00Z
```

## ═══ MANUAL_FLOWS.md ═══

```markdown
# MANUAL_FLOWS

> Scope: the manual/<flow>.md agent-executable adversarial scripts — schema, authoring rules, browser-agent
executability rules — and the per-app manual-flow surfaces (results route, dev-data routes, serve pages, results
folder, storybook QA story). Siblings: SPEC_CONTRACT.md (__specs__/ layout + spec schemas), FLOW_CONTRACT.md (flows/),
AGENT_AFFORDANCES.md. ---------- manual flow schema (manual/<flow>.md) ---------- A manual flow is the INDEPENDENT
ADVERSARIAL REVIEW of an operation against the REAL running surface — plain markdown an agent (Claude Code Chrome
extension, or the yk CLI) executes unattended after a human pastes it (or it's read from the app's local serve page).
It is NOT a restatement of flows/<fn>.flow.yaml or the tests: its job is to probe, abuse, and BREAK. MANDATORY, NO
ESCAPE HATCH: every callable surface (HTTP, CLI, or UI) HAS a flow with REAL runnable adversarial steps. An absent
flow, a happy-path-only flow, or a "the automated tests already cover this" stub is NON-COMPLIANT; no
automated-complete form exists. The loop: the extension drives the steps over HTTP / in the browser, POSTs results to
the local-only results route (manual_flow_surfaces), and ALSO prints them (human copy-back fallback); the CLI agent
reads manual-results/ and acts on them.

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## manual_md

- `path`: <feature>/__specs__/manual/<flow>.md _(markdown; filename stem matches flows/<flow>.flow.yaml + the openapi operationId)_
- `required_sections`: _(markdown headings, in this order)_
  - "# <flow>" _(H1 title)_
  - "## Target" _(`local` | `live` + the base URL the agent drives (a flow MAY target the live site))_
  - "## Preconditions" _(what must hold first (auth, seed, a running peer service); "none" is allowed)_
  - "## Steps" _(numbered; >= 1 ADVERSARIAL action (abuse input, cross authority, replay, race) — never happy-path only)_
  - "## Assertions" _(what MUST hold AND what MUST NOT happen (stating the negative is mandatory))_
  - "## Report" _(literal instruction: POST results to /api/v1/manual-results/<flow> AND print them)_
- `step_shape`: _(each numbered step, plain English the extension can execute)_
  - `action`: required _(e.g., "POST /v1/webhooks with another principal's id in the body")_
  - `selector`: optional _(UI only: data-testid / aria-label / role+name)_
  - `input`: optional _(value to send / type)_
  - `expected`: required _(one-line observable post-state (status code, body field, UI state))_
- `rules`:
  - spec_derived: authored from the SPEC ONLY (spec.yaml + spec.md + openapi.yaml/asyncapi.yaml + flows/<fn>.flow.yaml) — CODE-BLIND. Never read the source to write a flow. If the spec does not contain enough to author the flow, the SPEC is deficient — fix the spec, do not peek at the code.
  - adversarial: at least one step crosses authority, abuses input, replays, or races — happy-path only is NON-COMPLIANT
  - no_escape_hatch: a flow that merely cites automated tests is NON-COMPLIANT
  - self_contained: pasteable as-is; no reference to repo-internal test names or fixtures
  - report_footer: the ## Report section names the exact POST route AND says to also print the results
- `browser_agent_rules`:
  - http_or_browser_only: every step is doable with ONLY browser actions + HTTP. NEVER instruct the agent to run SQL, read a DB table, read a file, run a shell command, or inspect server logs. If a step needs server-side data (a magic-link token, a generated code, a seeded id), expose it via a local-only HTTP endpoint and name that exact URL — see manual_flow_surfaces.dev_data_routes.
  - deterministic_auth: sign-in steps use a deterministic credential (a seeded email + password), NOT an emailed magic link. If a flow must exercise magic-link, it fetches the link from the dev-email HTTP endpoint (GET /api/v1/dev/emails?to=<email> → emails[0].magic_link_path) — never from the DB or a mailbox.
  - exact_urls_only: give the exact URL for every navigation/fetch. Explicitly tell the agent NOT to guess or invent endpoints.
  - retry_cap: every flow states "if a step fails twice, record the flow FAIL with a note and STOP — do not loop the step."
  - selectors_must_exist: every data-testid / data-agent-action / aria-label a step names MUST already exist in the shipped surface (verify against the rendered page); referencing a non-existent selector is NON-COMPLIANT.
  - machine_result: the ## Report POST body carries an explicit boolean `ok` per flow (ok:true=pass, ok:false=fail). Progress/telemetry posts (no `ok`) are NOT verdicts. A flow's status = its latest post WHERE ok IS NOT NULL; note-only posts NEVER mask a real pass/fail.
  - local_auth_works_on_http: auth a flow depends on MUST function over local http (e.g. session cookies are Secure only in production, never in local dev) so cross-app / SSO steps are runnable locally.

## manual_flow_surfaces

- `manual_results_route`:
  - `path`: POST /api/v1/manual-results/<flow> _(the extension POSTs each flow's results here)_
  - `runtime`: nodejs _(NEVER edge — it must write the local filesystem)_
  - `local_only`: true _(accept ONLY when NODE_ENV !== "production" AND the request origin is localhost / 127.0.0.1)_
  - `also_blocked_by`: the Phase-1 /api/* 503 middleware (defense in depth — it can never fire in a deployed env)
  - `writes_to`: <repo>/manual-results/<flow>.<iso8601>.json _(git-ignored; the CLI agent reads + edits these)_
  - `bounds`: flow stem validated against the shipped manual/<flow>.md set (no path traversal); body size-capped; application/json only
- `dev_data_routes`: _(local-only HTTP exposure of server-side data a browser agent needs)_
  - `local_only`: true _(NODE_ENV !== production AND localhost origin; prod 404 + blocked by the /api/* middleware)_
  - `runtime`: nodejs
  - `purpose`: a browser agent cannot read the DB; any datum a flow needs (magic-link token, OTP, generated id) is fetched over HTTP, never queried
  - `canonical`:
    - `"GET /api/v1/dev/emails?to=<email>"`: "returns the dev email outbox newest-first as JSON incl. a parsed magic_link_path — the only sanctioned way a flow obtains a magic link"
- `serve_pages`:
  - `local_only`: true _(served ONLY in local/dev; prod returns 404 (never on the live site))_
  - `noindex`: true _(meta robots noindex + X-Robots-Tag + robots.txt disallow)_
  - `routes`:
    - `"/manual"`: how-to guide + an index linking every manual/<flow>.md the app ships
    - `"/manual/<flow>"`: renders that flow's markdown for copy-paste into the extension
  - `executable_directive`: the index/run page is written AS AN IMPERATIVE AGENT SCRIPT, not a human brochure — a top
    preamble ("you are a QA agent; run ONLY the playbooks shown below, in order; sign in via the password form; report
    via the form/POST"), each playbook inlined with its login + target + numbered steps, and the browser_agent_rules
    guardrails restated. If the page offers a run filter, it states the ACTIVE filter and the visible count so the
    agent runs only the shown subset.
- `results_folder`:
  - `path`: <repo>/manual-results/ _(third top-level folder beside docs/ + code/)_
  - `gitignored`: true _(results are never committed)_
- `storybook_qa_story`: _(UI tier only (authored when a UI surface exists). Full shape: VERIFY_MANUAL_STORIES#verify-manual + verify_manual_master + verify_manual_separation.)_
  - `per_component`:
    a Verify-Manual story carrying the component's spec-derived manual flow as INSTRUCTIONS
    ONLY — what to test + what the spec promises. No component render (that is Playground) and
    no results form. Links to Playground (operate there; Showcase only when Playground cannot
    reach a required state) and tells the operator to record the verdict on the Master page.
  - `master_page`:
    exactly ONE library-wide `verify-manual--master` story: runbook + worklist (every
    component's Verify-Manual, linked) + the SINGLE results form — the only place verdicts are
    entered; it POSTs each saved verdict to the manual_results_route. Form code is never
    duplicated per component.

Last updated: 2026-07-12T00:00:00Z
```

## ═══ VERIFY_MANUAL_STORIES.md ═══

```markdown
# VERIFY_MANUAL_STORIES

> ---------- per-component Verify-Manual story ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## verify_manual

- `name`: Verify-Manual
- `required`: true
- `spec_derived`: true
- `is_instructions_only`: true _(CRITICAL — see verify_manual_separation below)_
- `rule`:
  INSTRUCTIONS ONLY — a SPEC-DERIVED runbook: WHAT the Claude Code Chrome extension tests
  + WHAT the spec promises. No component render, no results form — prose + a checklist,
  nothing else. Authored CODE-BLIND from spec.yaml + design.md + __specs__/manual/<flow>.md,
  so running it validates the component AGAINST the contract AND proves the spec accurate.
  A flow unwritable from the spec = deficient spec — fix the spec (per MANUAL_FLOWS.md).
- `shape`:
  a Story carrying ONLY the runnable QA instructions (same content as __specs__/manual/<flow>.md):
    - WHERE to operate: link to this component's Playground story (a specific Showcase story
      ONLY when Playground genuinely cannot reach a state the spec requires) — story contracts
      owned by STORY_FORMAT#story-file.
    - WHAT to do: every state/prop/action the SPEC declares, step by step.
    - WHAT to assert: the spec's MUST / MUST-NOT.
    - WHERE to record: the single form on the Verify-Manual » Master page (see
      verify_manual_master). The story MUST state, in words, that the verdict + findings are
      entered into the Master page form, which POSTs to /api/v1/manual-results/<flow>.
- `forbidden`:
  - rendering the component itself inside the Verify-Manual story (that is Playground's job — never duplicate the render)
  - an inline verdict / PASS-FAIL / findings / Save form inside the Verify-Manual story (the form lives ONCE, on the Master page)
  - any code copied from Playground, Showcase, or the Master form — Verify-Manual references them by link, it does not repeat them

## verify_manual_master

- `name`: Verify-Manual » Master
- `required`: true
- `cardinality`: exactly ONE per Storybook (a top-level entry, NOT per-component)
- `contents`: 1: the agent runbook (how to run a verification pass) 2: the worklist — every component's Verify-Manual story, linked, one row each 3: ONE results form — Component (storyId) selector + Verdict (PASS/FAIL) + Findings + Save — POSTing each saved verdict to /api/v1/manual-results/<flow> (the local-only route)
- `shape`:
  a single top-level Story `verify-manual--master`. Form controls carry the agent hooks
  (data-agent-action="verdict-pass|verdict-fail", verdict-findings, save-verdict) so the
  extension can fill + submit it. Worklist links are generated from the registered stories,
  not hand-maintained.
- `sidebar_position`: does NOT count against any component's six-entry cap (STORY_FORMAT#story-file)

## verify_manual_separation

- `rule`:
  Three distinct, non-overlapping homes — never copy one into another:
    - Playground → the component you OPERATE (live, controllable render). One per component.
      (Contract: STORY_FORMAT#story-file.)
    - Verify-Manual → the spec-derived test INSTRUCTIONS. No render, no form. Points to
      Playground (operate here) + Master (record here). One per component.
    - Verify-Manual » Master → the ONE runbook + worklist + results form for the whole library.
  Only when the spec needs a state Playground cannot reach does a Showcase story carry that
  state, and Verify-Manual links to it. Showcase is the exception, never the default.

Last updated: 2026-07-12T00:00:00Z
```

## ═══ STORYBOOK_TESTING.md ═══

```markdown
# STORYBOOK_TESTING

> Rationale for every rule: STORYBOOK_TESTING.rationale.md. Story format (Playground/AllVariants/Changelog shapes): STORY_FORMAT.md. Test IDs: TEST_NAMING.md. Unit-coverage bar the two-way rule pairs with: UNIT_COVERAGE#coverage. ---------- storybook component testing (two-way coverage) ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## storybook_component_testing

- `applies_when`: a feature ships a UI component with stories
- `playground_story`:
  - `rule`: every prop is a control in the Storybook controls sidebar — EXCEPT function props
  - `function_props`: wired to the Storybook `actions` panel (so an agent confirms the callback fires with the right args)
  - `consequence`: every prop value + every callback is reachable and observable from the story alone
- `two_way_coverage`:
  - `rule`: every control AND every scenario a component supports is verifiable BOTH ways
  - `way_1`: a unit test
  - `way_2`: the Claude Code Chrome Extension operating the Playground story (set control / trigger action / read result)
- `ids`: component cases follow TEST_NAMING (unit:<feature-path>/<Component>/<case>)

## no_orphan_markers

- `applies_to`: data-testid / data-agent-action / data-agent-step / aria-label / state CSS classes
- `rule`:
  - every marker on an element MUST be referenced by ≥ 1 test / selector / __specs__/manual/<flow>.md script
  - every test / selector MUST point at a marker on a real element
- `banned`:
  - data-testid added but never tested
  - test selector for a marker no element carries
  - state CSS class with no element carrying it
- `audit_location`: per-feature __specs__/spec.yaml documents markers; cross-feature registers via grep (no central marker-audit.md)

## computed_style

- `rule`: state changes a user is supposed to PERCEIVE are verified via getComputedStyle OR screenshot regression
- `banned`: classList.contains("active") alone (proves class was added; not that CSS responded)
- `example`:
  // BANNED:
  expect(el.classList.contains("active")).toBe(true);
  // REQUIRED:
  expect(window.getComputedStyle(el).backgroundColor).toBe("rgb(255, 0, 0)");

Last updated: 2026-07-12T00:00:00Z
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
