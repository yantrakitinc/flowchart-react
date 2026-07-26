# UTC_TIMESTAMPS

> Rationale for every rule: UTC_TIMESTAMPS.rationale.md. ---------- timestamps — UTC only, every layer ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## timestamps

- `db_column_type`: timestamp with time zone
- `db_connection`: TimeZone=UTC
- `app_code`: ".toISOString() | .getTime()"
- `banned`: ".toLocaleString() — anywhere non-UI"
- `ui_display`: 'Intl.DateTimeFormat(locale, { timeZone: "UTC" })'

## verification

see LOCK_FILES.md

Last updated: 2026-07-12T00:00:00Z