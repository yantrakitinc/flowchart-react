# STACK — detail

Why each rule in `STACK.md` exists. Read this when changing a rule, or when a rule feels arbitrary and you need the load-bearing reason.

## Why a stack standard exists at all

Stack standards exist to remove decisions. Every "which ORM / which logger / which package manager?" debate that the standard answers is a review-time argument that doesn't happen. The standard isn't preference — it's mechanical removal of recurring decisions. The aim is: a code agent reading this standard starts every greenfield feature on the same baseline as every other agent.

## Next.js-first, with override path

Most projects on this machine are or will be Next.js + React + TypeScript + Tailwind + Postgres + Drizzle. The stack section locks that baseline so a greenfield feature starts on familiar ground.

The override rule isn't a loophole — it's there because real choices change. A project that needs MongoDB (graph-shaped data, large-document writes, etc.) documents the override in its setup file with a reason. The reason gets reviewed. The default still applies to every other project.

PASETO + Drizzle as the auth default is documented in `AUTHORIZATION_STANDARDS.rationale.md` — the short version: framework-agnostic, full control over the cookie + token shape, matches the chat-agent-operable + server-side-only auth model.

## The linked-standards section

Each discipline lives in its own standard file with its own version bump and `last_updated` timestamp. STACK points at them rather than duplicating:

- `SPEC_CONTRACT.md` + `FLOW_CONTRACT.md` + `MANUAL_FLOWS.md` + `AGENT_AFFORDANCES.md` — folder layout (`__specs__/spec.yaml`, `flows/`, `manual/`), `data-agent-*` attributes, action verbs.
- `LOCK_FILES.md` — the per-feature lock file + freshness gate (the only verify script we run).
- `SPEC_CONTRACT#cross-cutting-declaration` — WCAG / auth / mobile / i18n declared per-spec.
- `INDUSTRY_STANDARDS_STACK.md` — named industry standards (OpenAPI, RFC 7807, OAuth 2.1, etc.).
- `AUTHORIZATION_STANDARDS.md` — Layer A + Layer B + the YAML→RLS DSL.
- `PROCESS_DISCIPLINE.md` — scope, defects, ordering, DB hygiene, decision boundary, pushback.

STACK stays focused on the technology-choice baseline; language, structure, and style rules live in the sibling standards (`TYPESCRIPT_HYGIENE.md`, `NAMING.md`, `CODE_DOCUMENTATION.md`, `LOGGING.md`, `DESIGN_TOKENS.md`, `UTC_TIMESTAMPS.md`, `SOURCE_FOLDERS.md`, `HEXAGONAL_ARCHITECTURE.md`).

Last updated: 2026-07-12T00:00:00Z
