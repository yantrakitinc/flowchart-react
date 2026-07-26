# PROJECT_ARCHITECTURE

> Architectural rules for a YK ecosystem service. Each service is ONE standalone Next.js app at `<repo>/code/web/`; there is no separate backend/frontend split. This file is the agent's single-read summary so coder.md / verifier.md stay small and load fast. Per-repo decisions live in the project's handoffs + README.yaml.

```meta
version: 1
last_updated: 2026-05-31T00:00:00Z
```

## rules

- `single_app_shape`:
  - `rule`:
    One Next.js app per service at `code/web/`. "Backend" and "frontend" are
    LAYERS inside that one app, not separate packages: server-only code
    (`src/db/*`, `src/features/<name>/{services,handlers,db}/*`) owns all data
    access; the UI layer (`src/features/<name>/{components,actions}/*`,
    `src/app/*` pages) is dumb-and-pretty and reaches data only through
    handlers. Phase 1 ships NO UI layer (§1.2) — API routes + CLI only — but
    the handlers it calls are the same ones a future UI calls.
  - `boundary`:
    Client (`"use client"`) components NEVER import server-only modules
    (`src/db/*`, repositories, `src/features/*/services/*`,
    `src/features/*/handlers/*`) directly; they go through Server Actions or
    route handlers. This is the React Server Components server/client
    boundary.
  - `enforced_by`:
    verifier gate `G-FRONTEND-BOUNDARY` (scripts/verify-no-server-imports).
  - `why`:
    a server-only data layer keeps the "client tries to read DB" bug class
    impossible, keeps handlers transport-agnostic (API route, Server Action,
    CLI, AI tool all call the same handler), and lets the UI be added later
    without touching business logic.

- `data_access_behind_handlers`:
  - `rule`:
    Every database read / write lives behind a server-only handler; no path
    goes from a browser to Postgres. RLS + brand-typed repositories enforce
    permission-based authorization; bypassing the handler bypasses the auth
    model.
  - `where`:
    code/web/src/db/* (Drizzle client + RLS context bridge);
    code/web/src/features/<name>/db/* (per-feature Drizzle schema + repositories + permissions.ts);
    code/web/src/features/<name>/{services,handlers}/* (business logic + iApiResult entry points);
    code/web/drizzle/* (SQL migrations)

- `handlers_are_transport_agnostic`:
  - `rule`:
    Every endpoint is a handler (`*.handler.ts`) returning `iApiResult<T>`,
    called by an API route today and by Server Actions / CLI / AI tools later.
    No Next.js or HTTP coupling inside the handler.
  - `api_contract`:
    Each HTTP surface emits `code/web/__specs__/openapi.yaml`; the CLI + any
    future UI consume that contract. UI (when built) calls Server Actions that
    delegate to handlers — never business logic in components.

- `ssr_only_authorization`:
  - `rule`: every permission check happens server-side BEFORE data crosses to the client; client-side gating is a UX hint, never a security gate. The gate is `app_has_permission(current_principal_id, slug)`.

- `gates_check_permissions_never_roles`:
  - `rule`: always `hasPermission(session, 'identity:org:create:owned')`; never `if (role === 'admin')`
  - `why`: roles are bags of permissions; reasoning about role names couples gates to a moving target

- `cuid2_for_pks_always`:
  - `rule`: every primary key is a CUID2 (`@paralleldrive/cuid2`); never an email / username / handle / external id
  - `why`: PKs must be immutable + app-generated + URL-safe; user-facing identifiers are not. See NAMING#naming.

- `soft_delete_with_redaction`:
  - `rule`: soft-delete + PII redaction for tables on the soft-delete list; all access through the repository layer

- `single_source_of_truth_zod`:
  - `rule`: one Zod schema serves request validation + Server Action input + DB shape (where applicable)
  - `why`: drift between separate schemas is the bug class this rule kills

- `external_and_cross_service_http_only`:
  - `rule`:
    External vendors (Stripe, Resend, …) go through an adapter
    (`code/web/src/adapters/<vendor>.ts`) returning canonical `i<Thing>`
    shapes; other YK services are reached over HTTP with a Bearer service
    token (e.g. POST identity.yantrakit.com/v1/tokens/introspect). No
    in-process imports across service repos.
  - `why`: vendor + service swaps stay local to the adapter / wire call; no boundary leak.

## source

- `exposure`: this file is the single read for the coder + verifier agents; per-repo handoffs + README.yaml carry project-specific scope + decisions.

## phase_1_scope

- `rule`:
  Phase 1 ships APIs + services + DB schemas + tests + OpenAPI + CLI
  subcommands — NO UI layer (§1.2). Per-service scope is owned by that
  service's handoff in com.yantrakit.architecture/docs/handoffs/ and the
  sequencing in docs/05-phase-plan.md; anything outside a handoff's "Scope:
  ship these" is a blocker — surface scope before coding.

Last updated: 2026-05-31T00:00:00Z