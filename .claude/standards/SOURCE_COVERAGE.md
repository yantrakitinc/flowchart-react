# SOURCE_COVERAGE

> agent needs to APPLY and ENFORCE: every source file resolves to a spec (or a deliberate ignore marker), feature_name rules, and the one-operation-per- feature folder shape. ---------- source coverage ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## source_coverage

- `rule`: every .ts/.tsx under src/ resolves to __specs__/spec.md (walking up) OR a .ignore.specs.yaml marker
- `marker_file`: .ignore.specs.yaml
- `marker_content`:
  - `empty`: deliberately exempt (cross-cutting)
  - `named`: "feature_name: <parent-feature-name>"
- `inheritance`: closest marker wins (deeper overrides shallower)
- `enforced_by`: scripts/verify/verify-specs.mjs --check source-coverage

## spec_yaml_feature_name

- `rule`: 'every __specs__/spec.md has `feature_name: <kebab-case>` as its first top-level field; unique repo-wide'
- `used_by`: .ignore.specs.yaml resolution

## one_operation_per_feature

- `rule`: each feature owns exactly one operation
- `enforced_by`: the verifier agent at Mode A; coder + feature-spec-writer SOPs cite the allowlist when generating sub-folders
- `subfolders_allowed_by_invocation_type`:
  - `internal`:       [db, mappers, types, validation, audit, mocks]
  - `http`:           [services, handlers, types, validation, audit, mocks] _(+ exactly 1 src/app/**/route.ts matching invocation.path)_
  - `server-action`:  [actions, services, types, validation, audit, mocks]
  - `ui`:             [components, services, types, validation, mocks]

Last updated: 2026-07-12T00:00:00Z