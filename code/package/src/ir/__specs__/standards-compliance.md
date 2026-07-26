# standards-compliance (lock + freshness marker)

The fenced ```yaml block below is the machine source of truth — verifiers read
only its flat key/value fields (`status` / `verified` / `last_validated`, the
`standards:` map). Narrative belongs in `spec.md`; history belongs in git.

## Lock state

`status: locked` — every scoped gate (source-coverage, docs, flow-coverage,
no-undeclared-deps, coverage-threshold, test-naming) passes for `src/ir/` as
of `last_validated` below.

## Standards map rationale (why NOT REQUIRED for this feature)

`src/ir/` is a pure, side-effect-free TypeScript type/enum/guard/JSON-Schema
module (`invocation.type: internal`) — no HTTP route, no database access, no
UI surface, no Next.js app layer, no Storybook story of its own, and no
service/repository/DI call graph. Every standard scoped to those concerns
(UI tiers, accessibility/mobile/i18n, HTTP/API surfaces, authorization,
Firebase, hexagonal service architecture, Next.js `src/` layout, Vercel
deploy, Storybook, E2E/journey/labs surfaces, and repo/process-level
standards such as issue/PR/branch/repo-provisioning mechanics that govern the
repository as a whole rather than this folder) is marked `NOT REQUIRED`
below. Standards that genuinely constrain this folder's shape — spec
authoring, flow docs, manual playbook, JSDoc, naming, TypeScript strictness,
test naming/tooling, coverage, no-theater-tests, scenario enumeration,
source-coverage resolution, the published-package repo layout, and citing
the named JSON Schema (draft 2020-12) industry standard rather than
inventing a bespoke validation format — are marked `100%`.

```yaml
# standards-compliance — per-feature lock + freshness marker.
# See LOCK_FILES.md for schema + workflow rules.

status: locked
verified: "100%"
last_validated: 2026-07-26T00:00:00Z
feature: code/package/src/ir

browser_validated: ""   # not applicable — no UI surface (see BROWSER_VALIDATION: NOT REQUIRED below)

standards:
  ACCESSIBILITY: NOT REQUIRED
  AGENT_AFFORDANCES: NOT REQUIRED
  API_ENVELOPE: NOT REQUIRED
  API_FIRST: NOT REQUIRED
  API_SURFACE: NOT REQUIRED
  AUTHORIZATION_STANDARDS: NOT REQUIRED
  BRANCHES_AND_COMMITS: "100%"
  BROWSER_VALIDATION: NOT REQUIRED
  CODE_DOCUMENTATION: "100%"
  COMPONENT_CREATION: NOT REQUIRED
  COMPONENT_DOCS: NOT REQUIRED
  COMPONENT_FOLDERS: NOT REQUIRED
  COMPONENT_LIBRARY_DOCTRINE: NOT REQUIRED
  COMPOSITE_CREATION: NOT REQUIRED
  CONTEXT_ECONOMY: NOT REQUIRED
  DECISION_LOG: NOT REQUIRED
  DESIGN_TOKENS: NOT REQUIRED
  E2E_TESTING: NOT REQUIRED
  ENV_VARS: NOT REQUIRED
  FLOW_CONTRACT: "100%"
  GOOGLE_FIREBASE_STANDARDS: NOT REQUIRED
  HEXAGONAL_ARCHITECTURE: NOT REQUIRED
  I18N: NOT REQUIRED
  INDUSTRY_STANDARDS_STACK: "100%"
  ISSUES: NOT REQUIRED
  LABS: NOT REQUIRED
  LOCAL_DEV_NETWORK: NOT REQUIRED
  LOCK_FILES: "100%"
  LOGGING: NOT REQUIRED
  MANUAL_FLOWS: "100%"
  MOBILE_FIRST: NOT REQUIRED
  MOCKING_DOCTRINE: NOT REQUIRED
  NAMING: "100%"
  NO_THEATER_TESTS: "100%"
  PACKAGE_PROJECT_STANDARDS: "100%"
  PAGE_CREATION: NOT REQUIRED
  PROCESS_DISCIPLINE: "100%"
  PROJECT_ARCHITECTURE: NOT REQUIRED
  PULL_REQUESTS: NOT REQUIRED
  README_CONTRACT: NOT REQUIRED
  REPO_GATE_INSTALLATION: NOT REQUIRED
  REPO_PROVISIONING: NOT REQUIRED
  REQUIREMENTS_CONTRACT: NOT REQUIRED
  ROOT_LAYOUT: NOT REQUIRED
  SCENARIO_ENUMERATION: "100%"
  SELF_HARDENING: NOT REQUIRED
  SITE_BLUEPRINT: NOT REQUIRED
  SOURCE_COVERAGE: "100%"
  SOURCE_FOLDERS: NOT REQUIRED
  SPEC_CONTRACT: "100%"
  STACK: NOT REQUIRED
  STANDARDS_CREATION_STANDARDS: NOT REQUIRED
  STATE_VOCABULARY: NOT REQUIRED
  STORYBOOK_SETUP: NOT REQUIRED
  STORYBOOK_TESTING: NOT REQUIRED
  STORY_FORMAT: NOT REQUIRED
  SUPERPOWERS: NOT REQUIRED
  TEST_NAMING: "100%"
  TEST_STACK: "100%"
  TYPESCRIPT_HYGIENE: "100%"
  UNIT_COVERAGE: "100%"
  USER_JOURNEYS: NOT REQUIRED
  UTC_TIMESTAMPS: NOT REQUIRED
  VERCEL_STANDARDS: NOT REQUIRED
  VERIFIER_MODES: NOT REQUIRED
  VERIFY_MANUAL_STORIES: NOT REQUIRED
  WRITING_ORDER: "100%"
```
