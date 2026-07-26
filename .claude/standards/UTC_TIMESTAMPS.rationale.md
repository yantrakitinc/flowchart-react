# UTC_TIMESTAMPS — detail

Why each rule in `UTC_TIMESTAMPS.md` exists. Read this when changing a rule, or when a rule feels arbitrary and you need the load-bearing reason.

## UTC-only, every layer

Three layers must agree on UTC:
- DB columns are `timestamp with time zone`. The DB stores UTC; the type carries timezone info for safe display.
- DB connection sets `TimeZone=UTC` so any session that forgets the type still reads UTC.
- App code uses `.toISOString()` or `.getTime()`. Both are timezone-neutral. `.toLocaleString()` and any locale-dependent formatter are banned outside UI.

UI display uses `Intl.DateTimeFormat(locale, { timeZone: "UTC" })`. The `timeZone: "UTC"` clause is mandatory — without it the user's browser locale leaks into the displayed timestamp, and a server log showing `12:00:00 PM` for a 17:00:00 UTC event becomes a debugging nightmare.

Last updated: 2026-07-12T00:00:00Z
