# TYPESCRIPT_HYGIENE

> Rationale for every rule: TYPESCRIPT_HYGIENE.rationale.md. ---------- TypeScript ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## typescript

- `strict`: true _(strict + strict null checks)_
- `any`: forbidden _(use `unknown` + narrowing)_
- `ts_ignore`: forbidden _(both @ts-ignore AND @ts-expect-error (outside __tests__/))_
- `eslint`: eslint-config-next + zero warnings (not just zero errors)

## types

- `co_location`: types live with the runtime code that owns them
- `banned`:
  - <name>.types.ts
  - per-folder types.ts for feature-internal types
- `export_rule`: only `export` a type/interface/class if another file imports it
- `exceptions`:
  - shared cross-feature contracts → dedicated file (e.g. src/lib/api/result.ts, <feature>/types/domain.ts)
  - ORM-schema-inferred types → stay as expressions on the schema export
  - generated types (codegen / CMS) → dedicated dirs

## verification

see LOCK_FILES.md

Last updated: 2026-07-12T00:00:00Z