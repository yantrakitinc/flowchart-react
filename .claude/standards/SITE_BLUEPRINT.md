# SITE_BLUEPRINT

> ---------- scope ----------

```meta
version: 2
last_updated: 2026-07-19T16:43:58Z
```

## scope

- `applies_to`: repos whose .standards/autonomy.yaml sets ui_discipline to full or crappy-permitted AND that contain (or are adding) page-tier surfaces per PAGE_CREATION.md
- `exempt_tiers`:
  - atomic _(COMPONENT_CREATION.md — buildable without a blueprint)_
  - composite _(COMPOSITE_CREATION.md — buildable without a blueprint)_
- `gated_tier`: page _(every surface_type in PAGE_CREATION#scope)_
- `short_circuit_green`:
  - ui_discipline: none
  - no spec.md with `tier: page` found in the repo

## blueprint

- `root`: docs/site/ _(path, repo-relative)_
- `required_files`:
  - 00-INDEX.md _(templates + reading order + lock marker location)_
  - 01-DESIGN-LANGUAGE.md
  - 02-ROUTES-AND-SHELL.md
  - 03-API-BINDINGS.md _(every surface -> existing endpoint | GAP-<n>)_
  - 99-COVERAGE-MATRIX.md
- `page_docs`: pages/<slug>.md _(one per route/surface in 02-ROUTES-AND-SHELL.md)_
- `flow_docs`: flows/<verb-slug>.md # one per interaction scenario
- `page_doc_required_sections`: _(H2, in order)_ [Purpose, Route & access, Layout, Components, Data, State matrix, Interactions, Edge cases, Accessibility, Responsive]
- `flow_doc_required_sections`: [Actors & trigger, Preconditions, Happy path, Branches & failures, Postconditions, Scenario checklist]

## completeness

- `no_placeholder_text`: bool _(true — no TBD / TODO / <placeholder> anywhere under docs/site/)_
- `all_sections_present`: bool # true — EVERY pages/*.md carries all 10 page-template H2s; EVERY flows/*.md all 6 flow-template H2s (not only page docs bound by a spec)
- `coverage_matrix_terminal_line`: "unmapped_stories: 0" _(literal machine-checkable final data line)_
- `journeys_covered`: every journey in the USER_JOURNEYS.md catalog (docs/journeys/) reaches its intent through the blueprinted pages/flows — a journey with no page path is an uncovered story
- `api_bindings_current`: every endpoint cited by a page/flow doc appears in 03-API-BINDINGS.md as existing or GAP-<n>

## airtightness

- `gap_citations_valid`: every `GAP-<n>` cited in pages/ or flows/ has a `| GAP-<n> |` row in 03-API-BINDINGS.md; `GAP-NEW` is a draft marker and MUST NOT survive to lock
- `endpoint_citations_resolve`: every `/api/v1/...` path cited in pages/ or flows/ appears verbatim in 03-API-BINDINGS.md (existing table or a GAP row); GAP rows enumerate concrete paths, never abbreviations
- `cross_references_resolve`: every `flows/<x>.md` and `pages/<y>.md` token anywhere under docs/site/ resolves to an existing file
- `matrix_references_all_docs`: every pages/*.md and flows/*.md basename appears at least once in 99-COVERAGE-MATRIX.md
- `matrix_covers_catalog`: when the repo has a story catalog (docs/plan/05-USER-STORIES.md), every `US-<e>.<n>` in it appears as a matrix row
- `built_claims_exist`: every Components-table row with status `built` cites a repo path that exists on disk
- `lock_precondition`: ALL airtightness checks green before the blueprint-locked marker is applied; a locked blueprint failing any of them is a verify-chain failure

## lock

- `marker_file`: docs/site/00-INDEX.md
- `marker`: "<!-- blueprint-locked: YYYY-MM-DD by:(user|agent) -->"
- `autonomy_key`: .standards/autonomy.yaml blueprint_lock_mode _(enum[autonomous, review-locked]; default autonomous when absent)_
- `agent_self_lock_requires`: all completeness checks green

## gate

- `blocked_action`: "starting or committing page-tier source (spec.md tier: page, or its co-located .tsx)"
- `preconditions`:
  - lock marker present in docs/site/00-INDEX.md
  - page spec.md carries blueprint_doc: path _(e.g. docs/site/pages/channel-queue.md)_
  - blueprint_doc file exists, sections complete, no placeholder text
  - every flows/<x>.md referenced by the blueprint_doc exists
  - every endpoint in the blueprint_doc's Data section is existing (not GAP) in 03-API-BINDINGS.md
- `exempt_actions`:
  - atomic/composite component slices (any location per COMPONENT_CREATION discovery)
  - API/business-logic slices
  - blueprint doc edits themselves

## verifier

- `script`: scripts/verify/verify-outside-in.mjs --check site-blueprint
- `wired_into`: [pnpm verify chain, pre-commit Gate 2 for page-tier paths]
- `exit_semantics`: 0 green (incl. short-circuits) / 1 with per-violation lines

Last updated: 2026-07-19T16:43:58Z