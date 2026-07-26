# Templates

Boilerplate files for a new feature. Copy into `<feature-folder>/__specs__/` and fill in.

A feature spec, its flows, and its lock are each authored as ONE Markdown file
carrying a single fenced ```yaml block (the machine source of truth) plus prose
sections for humans/agents. The loader reads the fenced block; a legacy `.yaml`
sibling is still read for backward compatibility.

## What to copy

For every feature:
- `spec.md.template` → `__specs__/spec.md` (prose sections + one fenced ```yaml block)
- `flow.md.template` → `__specs__/flows/<fnName>.flow.md` (one per exported function)
- `standards-compliance.md.template` → `__specs__/standards-compliance.md`

Conditional:
- `openapi.yaml.template` → `__specs__/openapi.yaml` — when `invocation.type=http` in the spec.
- `asyncapi.yaml.template` → `__specs__/asyncapi.yaml` — when the feature emits or subscribes to events.
- `manual.md.template` → `__specs__/manual/<flow>.md` — when the feature is a UI or HTTP surface an agent can drive.

## Order

Write in this order (see WRITING_ORDER.yaml.writing_order):
1. spec.md
2. flow.md per exported function
3. openapi.yaml / asyncapi.yaml as applicable
4. CODE
5. tests
6. manual.md per UI / HTTP surface
7. manual verification (run feature + lint + typecheck + build + tests)
8. stamp standards-compliance.md (status:locked / verified:100% / last_validated:now-utc)

## Placeholders

Every `<PLACEHOLDER>` in a template must be replaced. Leaving a placeholder in is a defect.
