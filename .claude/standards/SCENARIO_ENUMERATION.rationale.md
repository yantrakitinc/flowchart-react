# SCENARIO_ENUMERATION — detail

Why each rule in `SCENARIO_ENUMERATION.md` exists.

## Intent

Walk the code path and cover the standard scenario categories (happy, validation, constraint, connection, cancellation, concurrency, TOCTOU, partial-state, authorization, idempotency, time-based). The per-export minimum test set (happy + declared errors + declared edges) is `UNIT_COVERAGE#every-export-tested`; this standard owns the category checklist that the enumeration walks.

## Independent scenario enumeration

Walk the code path, don't transcribe the request. For each operation, enumerate:

- Happy path.
- Input validation failure.
- DB constraint violation — uniqueness, FK, check, NOT NULL, partial-index conflict.
- Connection failure — pool exhausted, network drop, statement timeout.
- Operation cancellation — request aborted, container SIGTERM.
- Concurrent caller — two requests hitting the same resource at the same instant.
- TOCTOU race — `if (count === 0) insert(...)` is non-atomic.
- Partial-state on multi-write — service doing 2+ writes without a transaction.
- Authorization boundary — was the caller permitted?
- Idempotency — same call arrives twice (network retry, double-click, webhook redelivery).
- Time-based — token expiry, rate-limit window edges, DST, leap-second.

Listing only the scenarios the parent mentioned = transcribing, not auditing. If a scenario reveals a defect, STOP and surface (per PROCESS_DISCIPLINE).

## Exemption

Paths inside a `.archive/` folder are exempt (see STANDARDS_ENTRY).

Last updated: 2026-07-12T00:00:00Z
