# PROJECT_ARCHITECTURE — detail

Architectural decisions for a YK ecosystem service — one standalone Next.js app at `<repo>/code/web/`. The YAML beside this file is the agent's single-read summary; per-repo scope + decisions live in that service's handoff under `com.yantrakit.architecture/docs/handoffs/` and its `README.yaml`.

## Why these rules live in standards, not in the agent definitions

The agent files describe HOW the agent operates. Project policy — which authorization shape, which token format, which folders are off-limits — belongs in standards so:

- The decisions are auditable in one place per project.
- Multiple agents (coder, verifier, future ones) read the same source — no risk of drift between agent files.
- The agent files stay small enough to load fast at the start of every session.

## Mapping each rule to its enforcement surface

| Rule | Enforced by |
|---|---|
| single app shape (server/client layers, no separate packages) | code review + `verify-no-server-imports` (RSC boundary) |
| data access behind handlers | code review + `verify-no-superuser-in-runtime` (owner pool out of runtime) |
| handlers are transport-agnostic (`iApiResult<T>`) | code review + flow-coverage (every export documented) |
| SSR-only authorization | code review + integration tests that hit the surface anonymously |
| gates check permissions, never roles | grep gate at PR review (`grep -rn 'role ===' src` must be zero) |
| CUID2 for PKs | Drizzle schema review + migration replay tests |
| soft-delete with redaction | repo-layer tests + RLS policy review |
| single Zod schema | request-validation / server-action / repo review at PR time |
| external + cross-service HTTP-only | adapter layer + `no-restricted-imports` boundary (no cross-repo imports) |

## Relationship to AUTHORIZATION_STANDARDS

The PRIMARY RULE (permission-based querying via `app_has_permission`) is the contract; AUTHORIZATION_STANDARDS owns the brand-type + RLS shape. This file owns the project's structural policy ON TOP of that shape — where code lives, the server/client boundary, and how the UI layer (deferred in Phase 1) consumes handlers when it is built.

Last updated: 2026-05-31T00:00:00Z
