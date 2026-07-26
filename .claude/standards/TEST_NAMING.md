# TEST_NAMING

> ---------- the global test ID ----------

```meta
version: 1
last_updated: 2026-07-11T00:00:00Z
```

## test_id

- `form`: "<layer>:<path>" _(path-derived; never authored)_
- `layer`: enum[unit, e2e]
- `derivation`: path _(ID == folder/file path segments joined by "/")_
- `patterns`:
  - `e2e`: "e2e:<scenario>/<flow>/<variant>" _(e.g. e2e:booking/happy-path/ui)_
  - `unit_code`: "unit:<feature-path>/<file>" _(e.g. unit:scheduling/slot-service)_
  - `unit_code_case`: "unit:<feature-path>/<file>/<case-slug>" _(optional finer case)_
  - `unit_component`: "unit:<feature-path>/<Component>/<case>" _(e.g. unit:ui/SlotPicker/disabled-state)_
- `casing`: kebab-case _(EXCEPT component segments = PascalCase (match src/components/ui/<Name>/))_
- `references`: [results, filters, attestations, orphan_detection] _(all key off the ID only)_
- `orphan_rule`: a stored result whose ID no current file produces is deleted

## e2e_layout

- `home`: "e2e/" _(mono: one spanning folder at repo root; poly: per E2E_TESTING placement)_
- `scenario_folder`: "e2e/<scenario>/" _(<scenario> kebab-case, unique per home)_
- `scenario_overview`: "<scenario>.md"
- `flow_folder`: "e2e/<scenario>/<flow>/" _(<flow> kebab-case, unique per scenario)_
- `files`:
  - `machine_contract`: "<flow>.yaml" _(schema in E2E_TESTING.md)_
  - `flow_overview`: "<flow>.md"
  - `variant_spec`: "<flow>.<variant>.md" _(variant ∈ enum[ui, api, mixed]; Setup/Actions/Assertions)_
  - `variant_test`: "<flow>.<variant>.e2e.test.ts"
- `invariants`:
  - <flow>.yaml.scenario == scenario folder name
  - <flow>.yaml.flow == flow folder name
  - <flow>.yaml.variants[] matches the variant files present (no stray, no missing)

## unit_layout

- `code_test`: "<feature>/__tests__/<code>.test.ts(x)" _(ID: unit:<feature-path>/<code>)_
- `component_story`: "<Component>/__stories__/<Component>.stories.tsx" _(ID: unit:<feature-path>/<Component>/<case>)_
- `component_test`: "<Component>/__tests__/<Component>.test.tsx"
- `component_cases`: component + each Playground control + each scenario _(exercised by unit tests AND Chrome Extension)_

## seed_dataset

- `name`: kebab-case
- `referenced_by`: "<flow>.yaml.seed.dataset"
- `location`: "db/seeds/e2e/<dataset>.ts" _(one known per-repo place)_
- `target`: local-or-e2e-db-only _(never real/remote (see E2E_TESTING DB-safety))_

## discovery

- `e2e`: "**/e2e/**/<flow>/<flow>.yaml"
- `unit_code`: "**/__tests__/*.test.ts(x)"
- `unit_component`: "**/__stories__/*.stories.tsx"

## uniqueness

- `scenario`: unique per e2e home
- `flow`: unique per scenario
- `variant`: unique per flow
- `component`: unique repo-wide
- `consequence`: every test ID is unique by construction

## exemption

- `archive`: paths inside a `.archive/` folder are not discovered (see STANDARDS_ENTRY)

## enforced_by

scripts/verify/verify-test-naming.mjs _(pnpm verify chain; __tests__/__stories__ filename shapes + e2e scenario/flow folder contract + variants[] file match)_

## tooling_exception

files under scripts/**/__tests__/ may be <name>.test.mjs (node:test tooling suites)

Last updated: 2026-07-11T00:00:00Z