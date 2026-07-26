# HEXAGONAL_ARCHITECTURE

> Rationale for every rule: HEXAGONAL_ARCHITECTURE.rationale.md. ---------- architecture — services are canonical ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## architecture

- `call_graph`:
  [Server Action]  ──┐
  [API Route]   ─────┴─→ [Service] → [Repository] → [DB]
  [AI chat tool] ────┘            │
                                  └─→ [Mapper] → UI/domain shape
- `layers`:
  - `service`: canonical business logic
  - `server_action`: thin adapter — delegates to a service ('use server')
  - `api_route`: thin adapter — delegates to a service (src/app/api/.../route.ts)
  - `repository`: typed methods only (findOne, findMany, findById, create, update, delete); NO generic `execute(op, payload)`
  - `mapper`: DB shape ↔ UI/domain shape; 3rd-party ↔ domain
- `hexagonal`:
  - `rule`: services depend on injected INTERFACES, not concrete implementations
  - `every_external_dep_injected`: [DB, cache, clock, logger, event publisher, hasher, etc.]
  - `return_type`: services return plain domain types (NEVER framework shapes like Response / JSX / form state)
  - `composition_root`: one composition-root.ts per feature; wires concrete adapters into services
  - `no_di_container`: true
  - `no_decorators`: true
  - `test_root`: tests build their own composition root with fake/in-memory adapters
- `cross_feature_communication`:
  - `fire_and_forget`: events via outbox (write event in SAME transaction as data change; worker drains outbox)
  - `request_response`: injected interface owned by the consuming feature; implemented by providing feature's adapter
  - `banned`: events for request-response interactions

## verification

see LOCK_FILES.md

Last updated: 2026-07-12T00:00:00Z