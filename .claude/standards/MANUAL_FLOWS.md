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