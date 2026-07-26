# API_FIRST

> The website IS the API; UI is its first client. Every user capability ships as an API before any user-facing UI exists — so any future client (mobile, console, AI agent) drives the identical services.

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## ordering

_per site, strictly in this order_ 1_services_as_apis: every user capability is a service exposed via an HTTP API
(API_SURFACE.md parity; API_ENVELOPE.md response shape; AUTHORIZATION gating) 2_flows_immediately: the moment an API
lands, its flows are written — the most probable scenarios any user will face (FLOW_CONTRACT.md; mermaid diagram each)
3_e2e_every_flow: every flow gets a real E2E test through the actual transport (E2E_TESTING.md api variants) —
validated, gaps closed, tightened 4_mechanical_complete: the site is 100% functional with ZERO UI — everything a user
can do is achievable via APIs alone, proven by the attestation below 5_then_ui: page-tier UI starts ONLY after the
attestation is locked

## exemption

- `design_library`: atomics/composites (the design system) may be built ANY time — same exemption SITE_BLUEPRINT grants; user-facing pages/routes are what wait

## attestation

- `file`: docs/site/MECHANICAL_COMPLETE.yaml
- `shape`:
  - `marker`: "mechanical-complete: <YYYY-MM-DD> by:(user|agent)"
  - `flows`: map of every flow stem (every flows/*.flow.md in the repo) to its e2e contract path (e2e/<scenario>/<flow>/<flow>.yaml) — none omitted
- `gate`: scripts/verify/verify-outside-in.mjs --check api-first — page-tier source is REFUSED until the attestation exists, carries the marker, maps EVERY flow stem, every cited e2e path exists, and every flow has a mermaid diagram

## why_it_binds

any client — a different UI, a native app, an AI — consumes the same endpoints; user management, subscriptions, everything is API-reachable forever

Last updated: 2026-07-12T00:00:00Z