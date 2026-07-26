# CODING — detail

Why each rule in `CODING.yaml` exists. Read this when changing a rule, or when a rule feels arbitrary and you need the load-bearing reason.

## Why this standard exists at all

Code-style standards exist to remove decisions. Every "should this be camelCase or kebab-case?" debate that the standard answers is a 5-minute review-time argument that doesn't happen. Every "do we log this through console.log or a logger?" defaulted answer is a class of production-quality bug that doesn't ship.

The standard isn't preference — it's mechanical removal of recurring decisions. The aim is: a code agent reading this standard produces code that looks like every other code agent's, and that code is consistently testable, observable, and reviewable.

## Stack — Next.js-first, with override path

Most projects on this machine are or will be Next.js + React + TypeScript + Tailwind + Postgres + Drizzle. The stack section locks that baseline so a greenfield feature starts on familiar ground.

The override rule isn't a loophole — it's there because real choices change. A project that needs MongoDB (graph-shaped data, large-document writes, etc.) documents the override in its setup file with a reason. The reason gets reviewed. The default still applies to every other project.

PASETO + Drizzle as the auth default is documented in `AUTHORIZATION_STANDARDS.detail.md` — the short version: framework-agnostic, full control over the cookie + token shape, matches the chat-agent-operable + server-side-only auth model.

## TypeScript — strict + no any + no @ts-ignore

`strict: true` plus strict null checks turns the compiler into the first defense layer. Bad refactors don't compile. Missing-null bugs don't compile. Wrong-shape arguments don't compile.

`any` is banned because it's the escape hatch that defeats every other type-check. `unknown` is the safe alternative — the compiler refuses to USE the value until it's narrowed. The narrowing step is where the runtime check lives.

`@ts-ignore` and `@ts-expect-error` are banned in production code because they pretend a type error doesn't exist. The lone exception is `@ts-expect-error` in `__tests__/` — there the assertion that "this expression IS supposed to fail to compile" is itself the test.

Zero ESLint warnings (not just zero errors) closes the "warnings as informational" loophole. A warning that isn't acted on becomes wallpaper; eventually nobody notices when a real one shows up.

## Type co-location & export hygiene

Types live next to the runtime code that uses them. Pulling all interfaces into a separate `<name>.types.ts` makes the relationship between a type and the code it constrains invisible — readers have to jump between files to verify shape.

The rule: only `export` a type if another file imports it. An unused export is dead public API surface — confusing for readers ("who consumes this?"), expensive for refactors ("can I rename it?"), wrong for testability ("we shipped a type contract nobody uses").

Three exceptions are real:
- **Shared cross-feature contracts** — `src/lib/api/result.ts`, `<feature>/types/domain.ts`. Many consumers across many files justify the dedicated location.
- **ORM-schema-inferred types** — `type iUser = typeof users.$inferSelect` stays as an expression on the schema export; consumers write the inference inline rather than importing.
- **Generated types** (CMS, codegen) — machine-managed; live in dedicated dirs.

## JSDoc — light + required, with detail in specs

Every exported function/class/type/interface gets a JSDoc block with `@description`. The block is 1-3 lines — pointing at what the symbol does. The DETAIL of what it does, every parameter, every error case, every edge — lives in the spec.yaml + flow.yaml.

Why split: JSDoc bloat tempts authors to maintain two copies of the truth (JSDoc + spec). They drift. The 1-3-line rule + spec-pointer pattern says JSDoc is the locator; the spec is the truth. One source of truth, no drift.

`@example` is allowed when an example is genuinely clarifying. Most exports don't need one; specs do.

## Logging — central wrapper, redaction-required, separation from audit

Every feature uses `@/lib/logger` (Pino-backed by default). Banning `console.*` in production code paths catches the lazy "I'll just console.log this for now" that becomes permanent.

Log levels are deliberately separated:
- `info` for business events (significant enough to want in production)
- `debug` for step-by-step (function entry/exit; off by default; turned on when debugging)
- `warn` for recoverable issues (deserves attention but not alerts)
- `error` for caught exceptions (alerts; carry the full `err` object for stack)
- `trace` for verbose low-level (raw SQL params, request bodies; off by default everywhere; turned on only when actively debugging)

Redaction is mandatory and tested. Passwords / hashes / tokens / JWTs / session ids / API keys never reach storage. The redaction config has a test so it can't silently drift when a new secret-bearing field appears.

Separation between LOGGER (ops diagnostics) and AUDIT (compliance / business events) is a categorical rule. One event may produce both — a successful login emits an `info` log AND an audit_logs row — but the call sites are separate. Audit calls go through the audit layer with its own retention + tamper-evidence; logger calls go through Pino with its own retention + redaction. Mixing them means audit data leaks into log retention (too short) and log noise leaks into audit (compliance review chokes).

## Naming — interface prefix, class suffix, file-by-role

The naming rules exist so that a symbol's name reveals its role:
- `iUser` is a type/interface (the lowercase `i` prefix is the marker — visible in a long line of TypeScript symbols).
- `AuthServiceClass` is a class (the `Class` suffix is the marker — distinguishes from constants/functions sharing the noun).
- `MAX_LOGIN_ATTEMPTS` is a literal constant (ALL_CAPS).
- `LoginForm.tsx` is a component (PascalCase + .tsx).
- `auth.service.ts` is a utility/service (dot-case lowercase).

Error codes use `{CATEGORY}_{FEATURE}_{ERROR}` — at least 3 ALL_CAPS segments. `LOGIN_BAD_CREDENTIALS` not `BAD_CREDS`. The 3-segment shape ensures category + feature + specific-error are all present; the agent reading a problem response can categorize without parsing prose.

`data-testid` uses `<feature>-<element>-<type>` — at least 3 kebab-case segments. `whoami-actor-id` not `actor-id`. Same reasoning: feature disambiguates, element identifies the role, type identifies the kind. Collision-free across the codebase.

CUID2 is the primary-key type: collision-resistant, sortable-ish, URL-safe, no central coordination required.

## Tailwind — semantic tokens only

Hardcoded color-shade classes (`text-red-500`, `bg-zinc-400`) are banned because they encode a specific design decision at every call site. When the design system changes (`red-500` → `red-600` for better contrast), every call site has to be touched.

Semantic tokens (`text-error`, `bg-surface`, `text-muted`) defined in `globals.css` are indirection. The token name says what it MEANS; the value can change in one place.

Opacity-modified named colors (`text-white/60`) also pass — they're semantic (a named color modified by a documented intent: "60% of foreground"), not a hardcoded shade pick.

## Timestamps — UTC-only, every layer

Three layers must agree on UTC:
- DB columns are `timestamp with time zone`. The DB stores UTC; the type carries timezone info for safe display.
- DB connection sets `TimeZone=UTC` so any session that forgets the type still reads UTC.
- App code uses `.toISOString()` or `.getTime()`. Both are timezone-neutral. `.toLocaleString()` and any locale-dependent formatter are banned outside UI.

UI display uses `Intl.DateTimeFormat(locale, { timeZone: "UTC" })`. The `timeZone: "UTC"` clause is mandatory — without it the user's browser locale leaks into the displayed timestamp, and a server log showing `12:00:00 PM` for a 17:00:00 UTC event becomes a debugging nightmare.

## Top-level `src/` structure — Next.js layout

The shape is settled around Next.js App Router. `app/` for routes only (no logic). `components/` for UI primitives. `features/` for self-contained behavior bundles. `db/` for the top-level Drizzle client + RLS context helpers. `lib/` for framework-agnostic code. `hooks/` for React hooks. `views/` for composed views that span multiple features.

This layout is Next.js-first because most projects on this machine are Next.js. If a project picks a different framework, it overrides this section in its setup file with a documented reason.

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

## Architecture — services canonical, hexagonal, services-not-events for request/response

The call-graph rule: every entry point (Server Action, API Route, AI chat tool) is a thin adapter that delegates to a service. The service does the business logic, the service calls a repository, the repository talks to the DB.

Services depend on INJECTED INTERFACES, not concrete implementations. Every external dependency — DB, cache, clock, logger, event publisher, password hasher — is an interface. A composition root per feature wires the concrete adapters in. Tests build their own composition root with fake/in-memory adapters.

This means:
- Tests don't have to monkey-patch the real DB or fake `Date.now()`. They construct the service with their own adapters.
- Adding a new entry point (e.g., a CLI for the same business logic) is a wrapping concern, not a logic-duplication concern.
- The dependency graph is explicit. Reading the composition root tells you which adapter each service uses.

Repositories use typed methods only (`findOne`, `findMany`, `findById`, `create`, `update`, `delete`). No generic `execute(op, payload)` — that's the bypass that makes type checks meaningless. The typed method shape forces every call site to spell out what it's doing.

Cross-feature communication splits:
- **Fire-and-forget** (audit events, analytics events, notifications): use the outbox pattern. Write the event row in the SAME transaction as the data change; a worker drains the outbox to the event bus; consumers subscribe via AsyncAPI contracts.
- **Request-response** (feature A needs feature B to compute something synchronously): use an injected interface owned by the consuming feature, implemented by the providing feature's adapter. Events are the WRONG choice for request-response — they can't return values; you end up implementing RPC over events badly.

## Why the linked-standards section

Several disciplines split out into their own standard files. CODING points at them rather than duplicating:
- `AGENT_STANDARDS.yaml` — folder layout (`__specs__/spec.yaml`, `flows/`, `manual/`), `data-agent-*` attributes, action verbs.
- `STANDARDS_COMPLIANCE.yaml` — the per-feature lock file + freshness gate (the only verify script we run).
- `CROSS_CUTTING_CONCERNS.yaml` — WCAG / auth / mobile / i18n declared per-spec.
- `INDUSTRY_STANDARDS_STACK.yaml` — named industry standards (OpenAPI, RFC 7807, OAuth 2.1, etc.).
- `AUTHORIZATION_STANDARDS.yaml` — Layer A + Layer B + the YAML→RLS DSL.
- `PROCESS_DISCIPLINE.yaml` — scope, defects, ordering, DB hygiene, decision boundary, pushback.

Splitting these into their own files lets each evolve independently with its own version bump and `last_updated` timestamp. CODING stays focused on language + structure rules.

Last updated: 2026-07-11T00:00:00Z
