# SCENARIO_ENUMERATION

> Rationale for every rule: SCENARIO_ENUMERATION.rationale.md. Per-export minimum (happy + declared errors + declared edges): UNIT_COVERAGE#every-export-tested. ---------- independent scenario enumeration ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## scenario_enumeration

- `rule`: walk the CODE PATH; don't transcribe the request
- `per_operation_categories`:
  - happy path
  - input validation failure
  - DB constraint violation (uniqueness / FK / check / NOT NULL / partial-index)
  - connection failure (pool exhausted / network drop / statement timeout)
  - operation cancellation (request aborted / container SIGTERM mid-flight)
  - concurrent caller (two requests at the same instant)
  - TOCTOU race (read-then-write)
  - partial-state on multi-write (write A succeeds, write B fails)
  - authorization boundary (was the caller permitted?)
  - idempotency (same call arrives twice)
  - time-based (token expiry, rate-limit window edges, DST, leap-second)
- `on_unhandled_scenario`: STOP and surface (see PROCESS_DISCIPLINE.md); never silently leave ❌

Last updated: 2026-07-12T00:00:00Z