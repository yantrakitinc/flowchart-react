# E2E_TESTING

> Naming + IDs: see TEST_NAMING.md. Unit/in-feature tests: see UNIT_COVERAGE.md. ---------- scope ----------

```meta
version: 1
last_updated: 2026-07-11T00:00:00Z
```

## scope

- `covers`: end-to-end user journeys across features (does the product do what it should)
- `distinct_from`:
  - unit/in-feature tests (UNIT_COVERAGE)
  - per-feature manual playbooks (__specs__/manual/<flow>.md)

## parity

- `rule`: anything doable in the browser is doable via API (agent-operability bar)
- `consequence`: every flow normally has BOTH a ui variant AND an api variant
- `mixed`: only when one journey genuinely needs both

## structure

- `scenario`: a folder holding many flows
- `flow`: a sub-folder inside the scenario
- `english_in`: ".md (Setup/Actions/Assertions, plain English)"
- `machine_in`: "<flow>.yaml (never restates the English steps)"
- `ui_md_doubles_as`: chrome-extension steps
- `default_layout`: named files in the flow folder (<flow>.<variant>.md + <flow>.<variant>.e2e.test.ts)
- `blend_subfolder`: only when one variant grows into many files

## variant_spec

- `variant`: enum[ui, api, mixed]
- `sections`: _(exactly these three, in order)_
  - `setup`: preconditions + seed strategy (target = local/e2e DB only)
  - `actions`: the steps, in order
  - `assertions`: what must hold + what must NOT happen
- `external_dependency_steps`:
  a variant MAY scope out steps that require an un-mockable external service (payment, captcha,
  third-party OAuth) by stopping at the last locally-deterministic state and documenting the
  skipped tail under an "Out of scope (external deps)" heading in the variant .md. The complementary
  variant should cover the contract the skipped step would exercise where possible (e.g. the API
  variant proving the hold while the UI variant stops at bookable slots). Full coverage of the
  external step lands once that service is mockable (a later slice).

## flow_yaml

- `scenario`: string _(== scenario folder name)_
- `flow`: string _(== flow folder name)_
- `tag`: enum[own-flow, cross-project]
- `projects`: list<string> _(projects/repos the flow touches)_
- `seed`:
  - `strategy`: enum[auto, button-wait, human]
  - `dataset`: string _(kebab-case; see TEST_NAMING.seed_dataset)_
  - `command`: string _(required for button-wait/human + chrome-extension/manual runs (local/e2e DB only). For `auto` automated tests that seed in-suite (beforeAll/fixture), set "in-suite" — no external command.)_
  - `wait`: string _(button-wait only; how long to wait)_
  - `buttonLabel`: string _(button-wait only)_
  - `instructions`: string _(human only)_
- `runModes`: list<enum[local, online, hybrid]>
- `variants`:
  - kind: enum[ui, api, mixed]
    - `md`: path _(the English variant spec)_
    - `test`: path _(the e2e test)_
    - `runModes`: list<enum[local, online, hybrid]> _(optional per-variant override)_

## placement

- `principle`: E2E lives with the shared-truth boundary it exercises
- `mono`: one spanning e2e/ folder at repo root for the whole repo
- `poly`: per flow, in the repo owning the majority of behavior (center of gravity; projects[] makes it explicit)
- `api_boundary`: per-project E2E + a contract/integration test on each side
- `tagging`: own-flow vs cross-project so mono->poly extraction is clean

## db_safety

- `enforced_by`: scripts/verify/verify-tests.mjs --check e2e-db-safety _(pnpm verify chain; non-local conn strings + non-E2E_ DB env vars in e2e scope fail)_
- `never`: touch a real/remote/production database
- `never_wipe`: remote databases
- `targets_only`: [local-db, dedicated-e2e-db]
- `online_means`: an E2E environment with its own E2E database (never production)
- `full_wipe_reseed`: allowed (local / e2e only, because the target is never real data)

## seeding

- `default`: auto
- `strategies`:
  - `auto`: Claude Code runs the seed before the flow; automated tests seed in their own setup
  - `button-wait`: runner page renders a seed button (from config), runs, waits, continues automatically
  - `human`: exception for large seeds only — Chrome Extension asks the human, waits for continue
- `human_involvement`: none by default (only `human` strategy, justified by record volume)

## run_modes

- `local`: boot needed projects + DB locally, run
- `online`: against an E2E environment (own E2E DB), never production
- `hybrid`: a mix

## attestation

- `earned_when`: flow green across declared variants + modes
- `form`: timestamped + <sha>-stamped (reuse standards-compliance.md + compliant/<sha>)
- `raw_results`: ephemeral + gitignored

## exemption

- `archive`: paths inside a `.archive/` folder are exempt (see STANDARDS_ENTRY)

Last updated: 2026-07-11T00:00:00Z