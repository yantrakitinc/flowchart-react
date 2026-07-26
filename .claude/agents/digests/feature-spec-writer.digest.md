# DIGEST for feature-spec-writer.md — GENERATED, do not edit. Regenerate: node ~/.claude/standards/scripts/generate/generate-agent-digests.mjs
# sources:
#   SPEC_CONTRACT.md e987c2dce4aab609
#   FLOW_CONTRACT.md bd894c75b1bb108a
#   MANUAL_FLOWS.md 9b3a46ab8bbf92e7
#   AGENT_AFFORDANCES.md 565c2b38a69ae874
#   ACCESSIBILITY.md 21257554ab60b061
#   MOBILE_FIRST.md 5fc0d4890cddc292
#   I18N.md 84715bf371425a43
#   API_SURFACE.md f8cc4ee888477dd6
#   WRITING_ORDER.md 9ae74b0a72d2637d
#   DECISION_LOG.md 6e66ab4cda731377
#   BROWSER_VALIDATION.md a147729c5772a6f9
#   API_ENVELOPE.md c5c9c462f3c0ed0f
#   API_FIRST.md 2adc47de1ac4aaf5
#   REQUIREMENTS_CONTRACT.md 5c24e6a9b4fa0a1e
#   USER_JOURNEYS.md 50f91eded22e562e
#   CONTEXT_ECONOMY.md 7937af1a8307570f

## ═══ SPEC_CONTRACT.md ═══

```markdown
# SPEC_CONTRACT

> Scope: the per-feature __specs__/ contract — folder layout, the spec.md structure (narrative sections + one fenced machine block), the machine schema, and the four-concern cross-cutting declaration rule. Siblings: FLOW_CONTRACT.md (flows/<fn>.flow.md schema), MANUAL_FLOWS.md (manual/<flow>.md + per-app surfaces), AGENT_AFFORDANCES.md (on-page attrs + /agents.json + public surface). ---------- folder layout ----------

```meta
version: 1
last_updated: 2026-07-26T00:00:00Z
```

## folder_layout

- `parent_folder`:
  - "<code>.ts"
  - "__tests__/<code>.test.ts"
- `__specs__/`:
  - `required`:
    - spec.md
    - standards-compliance.md
  - `conditional`:
    - `openapi.yaml`: when feature ships HTTP routes _(industry-standard OpenAPI YAML, consumed by external tooling — stays .yaml)_
    - `asyncapi.yaml`: when feature emits or subscribes to events _(industry-standard AsyncAPI YAML — stays .yaml)_
    - `exception.yaml`: optional, opt-in — a standards waiver for this feature (see LOCK_FILES#exception-file)
  - `subfolders`:
    - `flows/`:
      - `pattern`: <fn>.flow.md _(one per exported function; schema in FLOW_CONTRACT#flow-md)_
    - `manual/`:
      - `pattern`: <flow>.md _(one runnable adversarial flow per HTTP / CLI / UI surface (markdown); schema in MANUAL_FLOWS#manual-md)_
- `format`: every machine artifact is a Markdown document whose FIRST fenced ```yaml block is the source of truth (the loader `scripts/lib/load-spec.mjs` reads that block; prose around it is agent/human context). Legacy `.yaml` siblings are still read for backward compatibility, but `.md` is the authored default.

## spec_md_structure

- `spec.md` is ONE file carrying two concerns: the narrative prose sections (below) AND exactly one fenced ```yaml machine block (the implementation contract in `## spec_machine_block`).
- `machine_block`: implementation contract ONLY — exactly what a coder builds + a verifier checks against (operation/invocation, schemas, links, authorization, public API, tokens/state-classes consumed, test coverage). No narrative, no options-considered, no rationale, no history. A field not consumed to implement or verify the feature does not belong.
- `narrative_sections`: concept, exploration, decisions + WHY, alternatives rejected, out of scope (the `## Concept` / `## Files` / `## Out of scope` headings in `## spec_md_sections`)
- `history`: not in spec.md — UI → Changelog story (STORY_FORMAT#story-file); everything else → git
- `rule`: if a line specifies the build, it goes in the fenced ```yaml machine block; if it explains/justifies, it goes in a prose section

## spec_machine_block

- `feature_name`: string _(kebab-case; unique repo-wide; named by .ignore.specs.yaml markers)_
- `scope_authority`: enum[user, claude] _(optional; default "user". When "claude", the coder makes in-spec scope calls
  without asking (helper extraction, internal field naming, table/column naming within the operation's domain, test
  fixture choices, log-key naming). NEVER applies to: invocation.type, public API shapes, permission slugs, data
  destruction, third-party API choice, library/framework choice, spec changes that alter behavior. Those still
  surface.)_
- `ui_design`: enum[required, not-applicable] _(optional. Default: required if invocation.type in (ui, server-action), else not-applicable. Set explicitly to override. When required, every flow needs __specs__/ui/<flow>.md with `<!-- ui-locked: YYYY-MM-DD -->` marker before coder phase runs (enforced by scripts/verify/verify-component.mjs --check ui-design-locked). When not-applicable, the spec.md narrative MUST include a one-line reason.)_
- `operation`:
  - `name`: string _(human-readable, e.g., "Sign in")_
  - `slug`: string _("(public)" | "(internal)" | <permission-slug>)_
  - `description`: string _(one-line plain English)_
- `invocation`:
  - `type`: enum[http, ui, server-action, internal]
  - `method`: string _(required if type=http; GET | POST | PUT | PATCH | DELETE)_
  - `path`: string _(required if type in [http, ui])_
  - `request_schema`: string _(optional; $ref or inline)_
  - `response_schema`: string _(optional; $ref or inline)_
- `chat_agent`:
  - `when_to_call`: string _(trigger condition the agent recognises)_
  - `when_not_to_call`: string _(anti-condition)_
  - `natural_language_examples`: list<string> _(user phrases for few-shot matching)_
  - `confirm_before`: string _(what agent says before invoking; "none — read-only" allowed)_
  - `summarize_after_success`: string _(one-line template)_
  - `summarize_after_failure`: string _(one-line template)_
- `cross_cutting`:
  - `wcag`: string _(sentence OR "n/a — <reason>")_
  - `auth`: string _(one-line summary; structured details in `authorization` block (required for DB-touching features per RULE 0))_
  - `mobile`: string
  - `i18n`: string
- `authorization`: _(REQUIRED on every DB-touching feature (schemas, repositories, services, routes, workers). RULE 0 enforces.)_
  - `layer_a_brand`: string _(the `AuthorizedPrincipal<S>` slug union the entry-point method requires; "n/a — schema, brand lives in the repo spec" for table schemas)_
  - `rls_directive`: string _(for schemas: "ENABLE ROW LEVEL SECURITY" (NOT FORCE — see cloud_sql_caveat); for non-schema features: "n/a — <reason>")_
  - `policies`: _(list — for schemas with RLS: one entry per CREATE POLICY clause. For repositories/services: [].)_
    - operation: enum[SELECT, INSERT, UPDATE, DELETE]
      - `slug`: string _(permission slug the policy checks (or "(deny-all)" for closed policies))_
      - `clause_using`: string _(USING clause body verbatim, or "n/a" if not applicable)_
      - `clause_with_check`: string _(WITH CHECK clause body verbatim, or "n/a" if not applicable)_
      - `rationale`: string _(one line: why this slug for this operation)_
  - `permission_slugs_used`: _(list — every slug this feature references)_
    - slug: string _(e.g. "emails:enqueue")_
      - `audience`: enum[user, service, both]
      - `roles_holding`: list<string> _(role slugs that get this permission at seed time)_
      - `permission_addition_spec`: path _(path to __specs__/permission-additions/<slug>.md when this slug is added by THIS slice (RULE 0.1 ceremony output). Omit when the slug pre-existed.)_
  - `rls_deny_test`: string _(path to the test that asserts an unauthorized principal is denied at the DB layer. "n/a — read-only" allowed only with explicit reason.)_
- `links`:
  - `flows`: list<path> _(required; ≥ 1)_
  - `tests`: list<path> _(required; ≥ 1)_
  - `manual`: list<path> _(optional)_
  - `openapi`: path _(required if invocation.type=http)_
  - `asyncapi`: path _(required if feature emits/subscribes events)_

## cross_cutting_declaration

- `rule`: every spec.md machine block declares ALL FOUR cross_cutting keys (wcag, auth, mobile, i18n) — none omitted; "n/a" is allowed ONLY in the form "n/a — <reason>"; a bare "n/a" or a missing key is NON-COMPLIANT
- `ownership`: this file owns the DECLARATION requirement only; each concern's substantive rules live with its owning standard
- `content_owners`:
  - `wcag`: ACCESSIBILITY.md
  - `auth`: AUTHORIZATION_STANDARDS.md
  - `mobile`: MOBILE_FIRST.md
  - `i18n`: I18N.md

## spec_md_sections

- heading: "# <feature-path> — <one-line tagline>"
  - `body`: h1
- heading: "## Concept"
  - `body`: "one paragraph: what this folder is, why it exists"
- heading: "## Files"
  - `body`: "numbered list of every behavior + SETUP file"
- heading: "## Out of scope"
  - `body`: "bulleted list of what this folder explicitly does NOT do"
- heading: "## Machine spec"
  - `body`: "exactly one fenced ```yaml block — the `## spec_machine_block` schema. The loader reads this block; it is the implementation contract."

## standards_compliance_md

- `see`: LOCK_FILES.md _(a Markdown file whose fenced ```yaml block carries status/verified/last_validated + the per-standard map; legacy `.yaml` still read)_

## no_padding_folders

- `see`: SOURCE_FOLDERS.md _(single owner of the padding-folder ban + verify script)_

## writing_order

see WRITING_ORDER.md

## editing_locked

see WRITING_ORDER.md

## test_coverage

see UNIT_COVERAGE.md

## verification

see LOCK_FILES.md

## workflow_owners

- `spec_phase`: spec-writer agent
- `code_phase`: coder agent
- `verify_phase`: verifier agent
- `orchestration`: PM agent (when present) OR orchestrator
- `see`: AGENT_ARCHITECTURE.md

Last updated: 2026-07-26T00:00:00Z
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

## ═══ MANUAL_FLOWS.md ═══

```markdown
# MANUAL_FLOWS

> Scope: the manual/<flow>.md agent-executable adversarial scripts — schema, authoring rules, browser-agent
executability rules — and the per-app manual-flow surfaces (results route, dev-data routes, serve pages, results
folder, storybook QA story). Siblings: SPEC_CONTRACT.md (__specs__/ layout + spec schemas), FLOW_CONTRACT.md (flows/),
AGENT_AFFORDANCES.md. ---------- manual flow schema (manual/<flow>.md) ---------- A manual flow is the INDEPENDENT
ADVERSARIAL REVIEW of an operation against the REAL running surface — plain markdown an agent (Claude Code Chrome
extension, or the yk CLI) executes unattended after a human pastes it (or it's read from the app's local serve page).
It is NOT a restatement of flows/<fn>.flow.md or the tests: its job is to probe, abuse, and BREAK. MANDATORY, NO
ESCAPE HATCH: every callable surface (HTTP, CLI, or UI) HAS a flow with REAL runnable adversarial steps. An absent
flow, a happy-path-only flow, or a "the automated tests already cover this" stub is NON-COMPLIANT; no
automated-complete form exists. The loop: the extension drives the steps over HTTP / in the browser, POSTs results to
the local-only results route (manual_flow_surfaces), and ALSO prints them (human copy-back fallback); the CLI agent
reads manual-results/ and acts on them.

```meta
version: 1
last_updated: 2026-07-26T00:00:00Z
```

## manual_md

- `path`: <feature>/__specs__/manual/<flow>.md _(markdown; filename stem matches flows/<flow>.flow.md + the openapi operationId)_
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
  - spec_derived: authored from the SPEC ONLY (spec.md + openapi.yaml/asyncapi.yaml + flows/<fn>.flow.md) — CODE-BLIND. Never read the source to write a flow. If the spec does not contain enough to author the flow, the SPEC is deficient — fix the spec, do not peek at the code.
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

## ═══ AGENT_AFFORDANCES.md ═══

```markdown
# AGENT_AFFORDANCES

> Scope: what an operating agent can SEE and USE — /agents.json + /agents.txt auto-generation, on-page data-* / aria
attributes, the action-verb catalog, and the public-facing surface (/llms.txt, docs pages, OpenAPI descriptions,
banned human-only UI). Siblings: SPEC_CONTRACT.md (spec.md schema the index derives from), FLOW_CONTRACT.md,
MANUAL_FLOWS.md. ---------- /agents.json + /agents.txt auto-generation ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## agents_index

- `generated_at`: build-time _(never hand-maintained; never runtime)_
- `source`: every <feature>/__specs__/spec.md in repo _(schema: SPEC_CONTRACT#spec-machine-block)_
- `outputs`:
  - `"/agents.json"`:
    - `format`: structured-json
    - `derived_from`: spec.md.operation + invocation + chat_agent
    - `consumers`: agents, tooling, CLI wrappers
  - `"/agents.txt"`:
    - `format`: plain-text-summary
    - `derived_from`: /agents.json
    - `consumers`: humans, llms.txt-style readers
- `hand_maintained_index_file`: forbidden

## interactive_element_attributes

- `data-testid`:
  - `required`: true
  - `format`: <feature>-<element>-<type> _(kebab-case, ≥ 3 hyphen-separated segments)_
- `data-agent-action`:
  - `required`: true
  - `value_from`: action_verbs _(see catalog below)_
- `data-agent-step`:
  - `required`: true
  - `format`: <surface>:<state> _(e.g., "whoami:anonymous")_
- `aria-label`:
  - `required`: true
  - `format`: plain-English description of the element

## action_verbs

- signin
- signout
- view
- refresh
- reload
- create
- edit
- delete
- submit
- cancel
- save
- discard
- open
- close
- expand
- collapse
- select
- deselect
- toggle
- copy
- paste
- confirm
- dismiss

## new_verb_policy

extend this list via PR; never invent inline

## public_surface

- `/llms.txt`:
  - `required`: true
  - `location`: site root
  - `format`: plain text; index of operations + docs URLs + manual-script URLs
- `docs_pages`:
  - `rendering`: server-rendered HTML / markdown (no JS required to read)
  - `test`: '`curl <docs-url>` returns readable content'
- `openapi_descriptions`:
  - `style`: plain English sentences in every `description:` field
  - `operationId`: matches manual/<flow>.md filename stem
- `banned_ui`:
  - hover-only menus
  - drag-only interactions
  - image-only buttons (no aria-label / no text)
  - focus-only modals (no escape route)

Last updated: 2026-07-12T00:00:00Z
```

## ═══ ACCESSIBILITY.md ═══

```markdown
# ACCESSIBILITY

> ---------- the bar ----------

```meta
version: 1
last_updated: 2026-07-16T00:00:00Z
```

## wcag_bar

- `name`: WCAG 2.2 AA accessibility
- `applies_to`: every UI folder (components, pages)
- `test`: each interactive element keyboard-operable, screen-reader-labelled, contrast-passing
- `spec_declaration`: every spec.md declares how the feature handles this concern (or "n/a — <reason>") — declaration rule owned by SPEC_CONTRACT.md

## aria_pattern_required

- `rule`:
  every primitive's design references a real WAI-ARIA APG pattern URL
  (https://www.w3.org/WAI/ARIA/apg/patterns/<slug>/) OR an explicit "n/a — <reason>".
- `declared_in`: __specs__/design.md (design-phase completeness enforcement owned by COMPONENT_CREATION.md)

## test_runner

- `rule`: every primitive ships a passing `pnpm verify:stories` run before merge
- `scripts`: test:stories: "test-storybook --url http://localhost:41495 --maxWorkers=2  // requires SB already running" verify:stories: | start-server-and-test 'storybook dev -p 41495 --no-open --quiet' http://localhost:41495 'test-storybook --url http://localhost:41495 --maxWorkers=2'
- `config_file`: ".storybook/test-runner.ts"
- `behavior`:
  On each story (Playground + AllVariants), test-runner mounts the story in a real Chromium
  browser, injects axe-core, and runs the WCAG 2.0 A + 2.0 AA + 2.2 AA rule set. Failing rules
  throw with the offending element's target selector, html, and failureSummary.
- `preview_wiring`: "`parameters.a11y.test: \"off\"` in preview.ts — the addon panel audits, the test-runner gates; wiring owned by STORYBOOK_SETUP#storybook-config-required"
- `documented_exceptions`:
  - `rule`:
    Brand decisions that intentionally fall below WCAG-AA are opt-in via the
    `data-axe-exception="<name>"` attribute. The test-runner config maps each attribute value
    to ONE disabled axe rule; every other rule still runs on the excepted subtree. Every
    exception is grep-able by searching `data-axe-exception=` across source.
  - `schema`:
    - `"data-axe-exception=<name>"`:
      - `disabled_rule`: "<axe rule id>"
      - `rationale`: "<one-paragraph design call>"
  - `initial_exceptions`:
    - `"v2-severity-saturated"`:
      - `disabled_rule`: "color-contrast"
      - `rationale`:
        V2 brand ships saturated severity colors (#ef4444 critical/destructive, #f97316
        serious, #f59e0b amber CTA) that fall below WCAG AA-normal (4.5:1) at small text.
        Brand decision — load-bearing for "scan glance" recognition across the extension.
    - `"v2-small-target"`:
      - `disabled_rule`: "target-size"
      - `rationale`:
        Checkbox size="small" ships at 14px to fit dense scan-config rows. Use ONLY when
        row spacing physically guarantees ≥ 24px between adjacent targets.
- `enforcement`:
  `pnpm verify:stories` is part of `pnpm verify`; a failing run = failing verify chain — no
  merge. Status: `locked` requires a green test-runner run AT THE TIME of locking, recorded
  in standards-compliance.md (see LOCK_FILES.md).
- `wiring_gate`: scripts/verify/verify-tests.mjs --check accessibility-wiring _(refuses a Storybook UI repo that does not wire verify:stories + test-runner.ts into pnpm verify)_

Last updated: 2026-07-16T00:00:00Z
```

## ═══ MOBILE_FIRST.md ═══

```markdown
# MOBILE_FIRST

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## mobile_first

- `name`: mobile-first
- `applies_to`: every UI folder
- `test`: design starts at small viewport; grows up
- `spec_declaration`: every spec.md declares how the feature handles this concern (or "n/a — <reason>") — declaration rule owned by SPEC_CONTRACT.md
- `storybook_review`: small-first review runs on the viewport presets owned by STORYBOOK_SETUP#required-addons

Last updated: 2026-07-12T00:00:00Z
```

## ═══ I18N.md ═══

```markdown
# I18N

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## i18n

- `name`: internationalization
- `applies_to`: every UI folder
- `test`: no hardcoded user-facing strings; every label routed through the i18n layer
- `spec_declaration`: every spec.md declares how the feature handles this concern (or "n/a — <reason>") — declaration rule owned by SPEC_CONTRACT.md

Last updated: 2026-07-12T00:00:00Z
```

## ═══ API_SURFACE.md ═══

```markdown
# API_SURFACE

> agent needs to APPLY and ENFORCE: server-action↔HTTP parity, /api/v1 versioning, runtime surfaces, and visibility gates. ---------- API surface ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## api_surface

- `rule`: every service method called by a Server Action MUST ALSO be exposed as an HTTP route
- `per_route_artifacts`:
  - "<feature>/__specs__/openapi.yaml" _(per-feature OpenAPI; schema owner: SPEC_CONTRACT.md)_
  - "<feature>/__specs__/manual/<flow>.md" _(browser-executable manual script; see MANUAL_FLOWS.md)_
- `versioning`:
  - `url_pattern`: "/api/v1/..."
  - `breaking_change`: bump to /api/v2/...
- `authorization`: see AUTHORIZATION_STANDARDS.md (Layer A + Layer B + YAML→RLS DSL)
- `runtime_surfaces`:
  - `"/openapi.json"`:
    - `auto_generated`: true
    - `source`: every <feature>/__specs__/openapi.yaml
    - `see`: AGENT_AFFORDANCES#agents-index
  - `"/docs"`:
    - `type`: Swagger UI dev + staging: visible
    - `production`: gated behind admin auth
- `visibility_gates`:
  - `ENABLE_ALL_API`:
    - `true`: 'ALL API routes reachable, including `visibility: "internal"`' false (default in production): internal routes return 404
  - `ENABLE_SWAGGER_FOR_ALL_API`:
    - `true`: Swagger UI lists ALL endpoints false (default in production): 'only `visibility: "public"` endpoints appear'
  - `local_dev_defaults`: both true
  - `production_defaults`: both false
  - `on_flip_in_production`: MUST emit an audit event on flip + flip-back
- `route_meta`:
  - `required_export`: "export const apiMeta = { visibility: 'public' | 'internal' } as const;"
  - `public`: always reachable + always in Swagger
  - `internal`: reachable only when ENABLE_ALL_API=true; in Swagger only when ENABLE_SWAGGER_FOR_ALL_API=true

Last updated: 2026-07-12T00:00:00Z
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
  - `output`: __specs__/{spec.md, spec.md, flows/, manual/ for EVERY HTTP|UI surface (mandatory; never omitted), ui/ if UI surface, openapi.yaml if HTTP, asyncapi.yaml if events}
  - `hands_off_to`: coder
  - `steps`: 1: write __specs__/spec.md AND __specs__/spec.md 2: write __specs__/flows/<fn>.flow.md for every
    exported function 3: write __specs__/openapi.yaml if invocation.type=http 4: write __specs__/asyncapi.yaml if
    folder emits/subscribes events 5: 'write __specs__/manual/<flow>.md for EVERY HTTP / CLI / UI surface — MANDATORY,
    never skipped. A RUNNABLE adversarial flow (copy-paste into the Claude Code Chrome extension; drives the surface,
    POSTs results to /api/v1/manual-results/<flow>, prints them), NOT a copy of flows/ or the tests. Markdown only;
    five sections (Target/Preconditions/Steps/Assertions/Report); >= 1 "MUST NOT" assertion. NO automated-complete
    escape hatch, NO .yaml form — "tests already cover it" is non-compliant; an absent flow for a callable surface is
    non-compliant. See MANUAL_FLOWS#manual-md + MANUAL_FLOWS#manual-flow-surfaces.' 6: 'write __specs__/ui/<flow>.md
    if invocation.type in (ui, server-action) AND spec.md.ui_design != not-applicable; route to user for sign-off;
    user inserts `<!-- ui-locked: YYYY-MM-DD -->` marker in each file after approving (spec-writer NEVER self-signs)'
    7: drop __specs__/ui/<flow>.design-<state>.png for every state declared in <flow>.md (one PNG per state); user
    exports from any design tool and commits; filename convention is the contract
  - `blocks_coder_phase_until`:
    Path 1: every required __specs__/ui/<flow>.md carries `<!-- ui-locked: YYYY-MM-DD -->` (enforced by verify-ui-design-locked.mjs). Coder phase cannot start without this.
    Path 2 is checked at verify-phase: every required __specs__/ui/<flow>.design-<state>.png scores ≥ ui_screenshot_match_threshold against the Puppeteer screenshot of the matching state (enforced by verify-component --check ui-screenshots-match-designs.mjs). Verifier Mode A cannot stamp the lock without this.
    Features with spec.md.ui_design: not-applicable skip BOTH paths; a one-line reason in spec.md is required.
- `code_phase`:
  - `owner`: coder
  - `output`: source + __tests__/ (red/green TDD with targeted runs allowed)
  - `dialogue_required_with`: feature-spec-writer (when spec is unclear / contradictory / suboptimal)
  - `hands_off_to`: verifier
  - `steps`: 1: write the code (driven by the specs) 2: add JSDoc on every exported function (1-3 lines; detail lives in spec) 3: write __tests__/<code>.test.ts — 100% coverage required (perFile) 4: run targeted `pnpm vitest run <slice-path>` for red/green TDD; NEVER run full verify chain
- `verify_phase`:
  - `owner`: verifier
  - `mode`: A _(semantics: LOCK_FILES#verifier-modes)_
  - `output`: __specs__/standards-compliance.md stamped on green (status:locked, verified:100%, last_validated:<utc-now>) per LOCK_FILES#schema
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
- `spec_phase_start`: set standards-compliance.md status=unlocked
- `steps`: 1: set status=unlocked 2: feature-spec-writer updates __specs__/spec.md + __specs__/spec.md + flows/ +
  manual/ 3: coder updates source + __tests__/ (100% maintained) 4: verifier Mode A re-runs targeted gates on the
  slice + blast radius 5: verifier re-stamps standards-compliance.md (status=locked, last_validated=<now-utc>) on
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

- `rule`: optional spec.md field; one of {user, claude}; default "user"
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
- `lock_stamp`: the feature's standards-compliance.md carries browser_validated:<ISO-8601-UTC>, stamped by verifier Mode A ONLY after the walk is green (LOCK_FILES#schema)
- `results_record`: verdicts persist via POST /api/v1/manual-results/<flow> (MANUAL_FLOWS.md per-app surfaces)
- `ci_split`: walk records are LOCAL evidence (git-ignored) — the record check runs on local machines only; CI validates the committed stamps/locks (browser walks cannot run in CI)
- `no_walk_no_stamp`: a UI-bearing feature's lock without browser_validated fails verify-standards-compliance — mechanically, every verify chain run

## not_required_when

- the repo declares ui_discipline:none (.standards/autonomy.yaml)
- the feature ships no UI surface (no .tsx render surface, no stories, no routes)

## enforced_by

scripts/verify/verify-standards-compliance.mjs _(browser_validated stamp + record existence/freshness on UI-bearing features)_

## record_content_gate

scripts/verify/verify-stamps.mjs --check browser-validation-receipt _(record CONTENT — the newest manual-results record must be a real walk (ok:true + findings), not a stub)_

Last updated: 2026-07-16T00:00:00Z
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
  - `flows`: map of every flow stem (every flows/*.flow.md in the repo) to its e2e contract path (e2e/<scenario>/<flow>/<flow>.yaml) — none omitted
- `gate`: scripts/verify/verify-outside-in.mjs --check api-first — page-tier source is REFUSED until the attestation exists, carries the marker, maps EVERY flow stem, every cited e2e path exists, and every flow has a mermaid diagram

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

scripts/verify/verify-outside-in.mjs --check requirements _(shipping repo with features but no user-locked requirements = red)_

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
