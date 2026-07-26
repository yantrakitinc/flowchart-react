# SOURCE_FOLDERS — detail

Why each rule in `SOURCE_FOLDERS.md` exists. Read this when changing a rule, or when a rule feels arbitrary and you need the load-bearing reason.

## Top-level `src/` structure — Next.js layout

The shape is settled around Next.js App Router. `app/` for routes only (no logic). `components/` for UI primitives. `features/` for self-contained behavior bundles. `db/` for the top-level Drizzle client + RLS context helpers. `lib/` for framework-agnostic code. `hooks/` for React hooks. `views/` for composed views that span multiple features.

This layout is Next.js-first because most projects on this machine are Next.js (see `STACK#stack`). If a project picks a different framework, it overrides this section in its setup file with a documented reason.

## Per-feature folder structure — maximum, not minimum

A "feature" is a behavior bundle (auth, billing, profile, etc.) that owns its own slice of the codebase. The named sub-folder vocabulary is:

- `components/` — per-feature React components.
- `services/` — canonical business logic.
- `handlers/` — presentation-agnostic entry points (`.handler.ts`) returning `iApiResult<T>`; called by actions/, api routes, and any future transport. Separated from `actions/` so the SAME business orchestration is reused across transports (mobile, CLI) without coupling to Next.js Server Action ergonomics.
- `mappers/` — DB↔domain + 3rd-party↔domain converters.
- `db/` — Drizzle schema + repositories + per-feature `permissions.ts`.
- `actions/` — Next.js Server Actions (thin adapters delegating to handlers/).
- `api-contract/` — OpenAPI registration files (`.openapi.ts`); aggregated for build-time `/agents.json`.
- `validation/` — Zod schemas (the FE/BE contract surface).
- `types/` — domain types (`domain.ts`) — the FE/BE contract surface.
- `audit/` — per-feature audit-event keys + payload types.
- `mocks/` — per-feature MSW handlers + seed fixtures.
- `__tests__/` — feature-LEVEL integration tests (cross-file). Per-file tests live next to the file.

A feature picks ONLY the sub-folders it actually needs. Padding folders — empty, README-only, or `.gitkeep`-only — are banned and refused by `scripts/verify/verify-no-padding-folders.mjs`. Mandating every sub-folder would force README-padding for behaviors a feature doesn't have, drowning the real shape of each feature in folder noise. The mechanical refusal of padding means only sub-folders carrying real code exist; the present sub-folders ARE the documentation of what the feature does.

Last updated: 2026-07-12T00:00:00Z
