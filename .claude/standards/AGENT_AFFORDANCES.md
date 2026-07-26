# AGENT_AFFORDANCES

> Scope: what an operating agent can SEE and USE — /agents.json + /agents.txt auto-generation, on-page data-* / aria
attributes, the action-verb catalog, and the public-facing surface (/llms.txt, docs pages, OpenAPI descriptions,
banned human-only UI). Siblings: SPEC_CONTRACT.md (spec.yaml schema the index derives from), FLOW_CONTRACT.md,
MANUAL_FLOWS.md. ---------- /agents.json + /agents.txt auto-generation ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## agents_index

- `generated_at`: build-time _(never hand-maintained; never runtime)_
- `source`: every <feature>/__specs__/spec.yaml in repo _(schema: SPEC_CONTRACT#spec-yaml)_
- `outputs`:
  - `"/agents.json"`:
    - `format`: structured-json
    - `derived_from`: spec.yaml.operation + invocation + chat_agent
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