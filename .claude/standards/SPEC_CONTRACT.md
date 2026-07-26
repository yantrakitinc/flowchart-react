# SPEC_CONTRACT

> Scope: the per-feature __specs__/ contract — folder layout, the spec.yaml ↔ spec.md partition, both schemas, and the four-concern cross-cutting declaration rule. Siblings: FLOW_CONTRACT.md (flows/<fn>.flow.yaml schema), MANUAL_FLOWS.md (manual/<flow>.md + per-app surfaces), AGENT_AFFORDANCES.md (on-page attrs + /agents.json + public surface). ---------- folder layout ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## folder_layout

- `parent_folder`:
  - "<code>.ts"
  - "__tests__/<code>.test.ts"
- `__specs__/`:
  - `required`:
    - spec.yaml
    - spec.md
    - standards-compliance.yaml
  - `conditional`:
    - `openapi.yaml`: when feature ships HTTP routes
    - `asyncapi.yaml`: when feature emits or subscribes to events
    - `exception.yaml`: optional, opt-in — a standards waiver for this feature (see LOCK_FILES#exception-file)
  - `subfolders`:
    - `flows/`:
      - `pattern`: <fn>.flow.yaml _(one per exported function; schema in FLOW_CONTRACT#flow-yaml)_
    - `manual/`:
      - `pattern`: <flow>.md _(one runnable adversarial flow per HTTP / CLI / UI surface (markdown); schema in MANUAL_FLOWS#manual-md)_

## spec_yaml_vs_spec_md

- `spec_yaml`: implementation contract ONLY — exactly what a coder builds + a verifier checks against (operation/invocation, schemas, links, authorization, public API, tokens/state-classes consumed, test coverage). No narrative, no options-considered, no rationale, no history. A field not consumed to implement or verify the feature does not belong.
- `spec_md`: narrative ONLY — concept, exploration, decisions + WHY, alternatives rejected, out of scope
- `history`: not in spec.yaml/spec.md — UI → Changelog story (STORY_FORMAT#story-file); everything else → git
- `rule`: if a line specifies the build, it goes in spec.yaml; if it explains/justifies, spec.md

## spec_yaml

- `feature_name`: string _(kebab-case; unique repo-wide; named by .ignore.specs.yaml markers)_
- `scope_authority`: enum[user, claude] _(optional; default "user". When "claude", the coder makes in-spec scope calls
  without asking (helper extraction, internal field naming, table/column naming within the operation's domain, test
  fixture choices, log-key naming). NEVER applies to: invocation.type, public API shapes, permission slugs, data
  destruction, third-party API choice, library/framework choice, spec changes that alter behavior. Those still
  surface.)_
- `ui_design`: enum[required, not-applicable] _(optional. Default: required if invocation.type in (ui, server-action), else not-applicable. Set explicitly to override. When required, every flow needs __specs__/ui/<flow>.md with `<!-- ui-locked: YYYY-MM-DD -->` marker before coder phase runs (enforced by verify-ui-design-locked.mjs). When not-applicable, spec.md MUST include a one-line reason.)_
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

- `rule`: every spec.yaml declares ALL FOUR cross_cutting keys (wcag, auth, mobile, i18n) — none omitted; "n/a" is allowed ONLY in the form "n/a — <reason>"; a bare "n/a" or a missing key is NON-COMPLIANT
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

## standards_compliance_yaml

- `see`: LOCK_FILES.md

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

Last updated: 2026-07-12T00:00:00Z