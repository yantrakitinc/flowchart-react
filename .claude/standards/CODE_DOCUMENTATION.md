# CODE_DOCUMENTATION

> Rationale for every rule: CODE_DOCUMENTATION.rationale.md. ---------- documentation in code ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## docs

- `jsdoc_required_on`: [exported function, exported class, exported type, exported interface]
- `jsdoc_keys`: ["@description", "@param", "@returns", "@throws", "@example where helpful"]
- `jsdoc_length`: light (1-3 lines); detail lives in the spec
- `jsdoc_audience`:
  PARENT-FACING ONLY — what the symbol does, what to pass, what comes back.
  NOT for: history / "what changed" (→ Changelog story for UI; git for the rest);
  design rationale (→ spec.md); internal mechanics the caller never sees.
  UI prop interfaces: one-line description + @default + optional @example,
  nothing more (see COMPONENT_DOCS.md).
- `banned`:
  - commented-out code (git tracks history)
  - inline comments explaining WHAT (well-named identifiers do that)
  - history / changelog narration in JSDoc or comments (UI history → Changelog story; rest → git)
- `inline_comments`: default ZERO; only a WHY the code cannot express — hidden constraint, subtle invariant, workaround for a specific bug, non-obvious ordering requirement
- `spec_reference_format`: "// see <folder>/__specs__/flows/<fn>.flow.yaml"

## verification

see LOCK_FILES.md

Last updated: 2026-07-12T00:00:00Z