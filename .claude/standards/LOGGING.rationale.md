# LOGGING — detail

Why each rule in `LOGGING.md` exists. Read this when changing a rule, or when a rule feels arbitrary and you need the load-bearing reason.

## Central wrapper, redaction-required, separation from audit

Every feature uses `@/lib/logger` (Pino-backed by default). Banning `console.*` in production code paths catches the lazy "I'll just console.log this for now" that becomes permanent.

Log levels are deliberately separated:
- `info` for business events (significant enough to want in production)
- `debug` for step-by-step (function entry/exit; off by default; turned on when debugging)
- `warn` for recoverable issues (deserves attention but not alerts)
- `error` for caught exceptions (alerts; carry the full `err` object for stack)
- `trace` for verbose low-level (raw SQL params, request bodies; off by default everywhere; turned on only when actively debugging)

Redaction is mandatory and tested. Passwords / hashes / tokens / JWTs / session ids / API keys never reach storage. The redaction config has a test so it can't silently drift when a new secret-bearing field appears.

Separation between LOGGER (ops diagnostics) and AUDIT (compliance / business events) is a categorical rule. One event may produce both — a successful login emits an `info` log AND an audit_logs row — but the call sites are separate. Audit calls go through the audit layer with its own retention + tamper-evidence; logger calls go through Pino with its own retention + redaction. Mixing them means audit data leaks into log retention (too short) and log noise leaks into audit (compliance review chokes).

Last updated: 2026-07-12T00:00:00Z
