# ENV_VARS

> needs to APPLY and ENFORCE: env file rules, NEXT_PUBLIC_ discipline, and the printf rule for host-provider CLIs. ---------- environment variables ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## env_vars

- `required_files`: .env.example:
    - `location`: per-app root (e.g., `code/web/.env.example` for single-app; `code/apps/<app>/.env.example` for turborepo apps)
    - `contents`: EVERY required variable, keys only (no values)
    - `per_variable_comment`: "what it's for + where to get the value" .env.local:
    - `location`: same dir as .env.example (per-app, NOT repo root)
    - `gitignored`: true
    - `committed`: never
- `rules`:
  - server_only vars NEVER use NEXT_PUBLIC_ prefix
  - host-provider env-var setting via CLI uses `printf '%s'`, NEVER `echo`
  - admin email lists are semicolon-separated, lowercase

Last updated: 2026-07-12T00:00:00Z