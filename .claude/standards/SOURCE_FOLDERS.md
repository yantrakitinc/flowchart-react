# SOURCE_FOLDERS

> Rationale for every rule: SOURCE_FOLDERS.rationale.md. ---------- top-level src/ structure (Next.js layout) ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## top_level_src

- `app/`: Next.js routes ONLY (no logic)
- `components/`:
  - `shadcn/`: shadcn-generated UI primitives
  - `ui/`: project UI components features/<name>/: feature folders (see per_feature_structure)
- `features/shared/`: cross-feature shared schemas / types
- `views/`: composed views (multiple features per view)
- `services/`: cross-feature service utilities (rare)
- `db/`: top-level DB client + RLS context helpers
- `lib/`: framework-agnostic libs
- `hooks/`: cross-feature React hooks
- `types/`: cross-feature TypeScript types
- `constants/`: cross-feature constants
- `config/`: env config readers
- `utilities/`: pure utility functions
- `security/`: cross-feature security helpers

## per_feature_structure

- `rule`: a feature uses ONLY the sub-folders it actually needs; README-only "padding" folders are BANNED; each sub-folder PRESENT must contain ≥ 1 .ts/.tsx file with real code; the list below is the allowed vocabulary. A feature is SELF-CONTAINED — its UI, business logic, DB schema, contract surface, audit events, and tests all live inside this folder.
- `enforcement`: scripts/verify/verify-specs.mjs --check no-padding-folders refuses any sub-folder under src/features/<name>/ with zero .ts/.tsx files (except __specs__/, which holds YAML)
- `sub_folders`:
  - `components/`: per-feature React components + their __tests__/ and __specs__/
  - `services/`: canonical business logic (service classes/functions) + __tests__/ and __specs__/ (see HEXAGONAL_ARCHITECTURE#architecture)
  - `handlers/`: presentation-agnostic entry points (.handler.ts) returning iApiResult<T>; called by actions/, api routes, and any future transport (mobile, CLI)
  - `mappers/`: DB-row ↔ domain-entity converters + 3rd-party-shape ↔ domain converters
  - `db/`: Drizzle schema (.schema.ts) + repositories (.repository.ts) + permissions.ts (per-feature slug catalog, TS const array — see AUTHORIZATION_STANDARDS.permission_slug_catalog) + __tests__/ and __specs__/
  - `actions/`: Next.js Server Actions (.action.ts) — thin adapters delegating to handlers/; client UI calls these
  - `api-contract/`: OpenAPI registration files (.openapi.ts) — one per HTTP endpoint; each calls registerOpenAPI(...) as a side-effect import; aggregated via per-feature openapi-registrations.ts barrel; consumed at build time to auto-generate /agents.json (see AGENT_AFFORDANCES)
  - `validation/`: Zod schemas (FE/BE contract surface)
  - `types/`: domain types (FE/BE contract surface) — domain.ts
  - `audit/`: per-feature audit-event keys + payload types — events emitted to the audit log; separate from logger ops events (see LOGGING#logging)
  - `mocks/`: per-feature MSW handlers + seed.ts fixtures
  - `__tests__/`: FEATURE-LEVEL integration tests only (cross-file); per-file tests live next to the file

## verification

see LOCK_FILES.md

Last updated: 2026-07-12T00:00:00Z