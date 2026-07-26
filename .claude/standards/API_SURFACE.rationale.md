# API_SURFACE — detail

Why each rule in `API_SURFACE.md` exists.

## API surface — every service has an HTTP route

The rule: every service method called by a Server Action MUST ALSO be exposed as an HTTP route, even when no external consumer is planned. Three reasons:

1. **Chat agent operability.** The agent has to be able to invoke every operation. Server Actions are framework-bound (Next.js); HTTP routes are universal. If the agent can only reach the operation through the UI, it can only operate it via the manual-script path. With an HTTP route, the agent can drive the service layer with pure data.

2. **Manual API testing.** The Chrome-extension agent drives Swagger UI in dev/staging to exercise every endpoint with pure data, independent of UI flows. Bugs that only surface through "wrong input shape" or "permission boundary" are caught at the API surface, not buried behind UI validation.

3. **Future external consumers.** Once a service is HTTP-callable, exposing it to a future CLI / API client / mobile app is a documentation change, not a re-architecture.

Each route gets:
- An entry in its feature's `__specs__/openapi.yaml` (SPEC_CONTRACT.md owns the schema).
- A manual script in `__specs__/manual/<flow>.md` (so the Chrome-extension agent can drive it; see MANUAL_FLOWS.md).
- A version prefix (`/api/v1/...`) — breaking changes bump to v2.
- Authorization via Layer A + Layer B (see AUTHORIZATION_STANDARDS).

`/openapi.json` is the auto-generated aggregate spec (the same one `agents_index` references in AGENT_AFFORDANCES.md). `/docs` is the Swagger UI shell — visible in dev/staging, gated behind admin auth in production.

## Visibility gates

`ENABLE_ALL_API` + `ENABLE_SWAGGER_FOR_ALL_API` separate "what's reachable" from "what's listed." Some endpoints exist for testing only (seed data, fixture flips, dry-runs, internal admin ops). They're never meant to be discoverable in production but need to exist for the maintainer.

`visibility: "public"` endpoints are always reachable + always in Swagger.
`visibility: "internal"` endpoints are reachable only when `ENABLE_ALL_API=true`; in Swagger only when `ENABLE_SWAGGER_FOR_ALL_API=true`.

Local dev: both default to `true` (developer needs full surface).
Production: both default to `false` (locked down).

The "flipping to true in production MUST emit an audit event" rule catches the abuse case — an attacker (or a careless admin) flips the flag, exposes internal endpoints, never flips back. The audit trail makes this auditable.

Last updated: 2026-07-12T00:00:00Z
