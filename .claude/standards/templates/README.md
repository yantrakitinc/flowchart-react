# Templates

Boilerplate files for a new feature. Copy into `<feature-folder>/__specs__/` and fill in.

## What to copy

For every feature:
- `spec.yaml.template` → `__specs__/spec.yaml`
- `spec.md.template` → `__specs__/spec.md`
- `flow.yaml.template` → `__specs__/flows/<fnName>.flow.yaml` (one per exported function)
- `standards-compliance.yaml.template` → `__specs__/standards-compliance.yaml`

Conditional:
- `openapi.yaml.template` → `__specs__/openapi.yaml` — when `invocation.type=http` in spec.yaml.
- `asyncapi.yaml.template` → `__specs__/asyncapi.yaml` — when the feature emits or subscribes to events.
- `manual.md.template` → `__specs__/manual/<flow>.md` — when the feature is a UI or HTTP surface an agent can drive.

## Order

Write in this order (see WRITING_ORDER.yaml.writing_order):
1. spec.yaml + spec.md
2. flow.yaml per exported function
3. openapi.yaml / asyncapi.yaml as applicable
4. CODE
5. tests
6. manual.md per UI / HTTP surface
7. manual verification (run feature + lint + typecheck + build + tests)
8. stamp standards-compliance.yaml (status:locked / verified:100% / last_validated:now-utc)

## Placeholders

Every `<PLACEHOLDER>` in a template must be replaced. Leaving a placeholder in is a defect.
