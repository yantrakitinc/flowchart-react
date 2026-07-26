# LOGGING

> Rationale for every rule: LOGGING.rationale.md. ---------- logging ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## logging

- `logger_module`: "@/lib/logger" _(central wrapper)_
- `banned`: console.* in production code paths
- `levels`:
  - `info`: significant business events (resource created, role assigned, multi-step flow completed)
  - `debug`: step-by-step (function entry/exit, repo query starting) — off by default
  - `warn`: recoverable issues (rate-limit hit, retry exhausted, deprecated path)
  - `error`: caught exceptions (pass `err` field for serializer)
  - `trace`: verbose low-level (raw SQL params, request bodies) — off by default
- `redaction`:
  - `rule`: logger config redacts sensitive values BEFORE persisting → "[REDACTED]"
  - `fields_redacted`: [passwords, password hashes, tokens, JWTs, session ids, API keys]
  - `test_required`: redaction config has a test so it can't drift
- `separation`:
  - `logger`: ops diagnostics
  - `audit_log`: compliance / business events _(per-feature audit/ folder shape: SOURCE_FOLDERS#per-feature-structure)_
  - `rule`: never pollute audit from logging code; one event may produce both, but the call sites are separate

## verification

see LOCK_FILES.md

Last updated: 2026-07-12T00:00:00Z