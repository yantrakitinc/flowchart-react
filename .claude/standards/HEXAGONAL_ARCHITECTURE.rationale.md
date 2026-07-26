# HEXAGONAL_ARCHITECTURE — detail

Why each rule in `HEXAGONAL_ARCHITECTURE.md` exists. Read this when changing a rule, or when a rule feels arbitrary and you need the load-bearing reason.

## Services canonical, hexagonal, services-not-events for request/response

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

Last updated: 2026-07-12T00:00:00Z
