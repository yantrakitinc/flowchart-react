# NAMING

> Rationale for every rule: NAMING.rationale.md. ---------- naming ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## naming

- `interfaces_and_types`: prefix `i` _(iUser)_
- `classes`: suffix `Class` _(AuthServiceClass)_
- `constants_literal`: ALL_CAPS _(MAX_LOGIN_ATTEMPTS)_
- `files`:
  - `components`: PascalCase _(LoginForm.tsx)_
  - `utilities_services_hooks`: camelCase or dot-case _(auth.service.ts, useSession.ts)_
- `primary_keys`: CUID2 (@paralleldrive/cuid2)
- `error_codes`: "{CATEGORY}_{FEATURE}_{ERROR}" _(≥ 3 ALL_CAPS segments)_
- `data_testid`: <feature>-<element>-<type> _(≥ 3 kebab-case segments)_
- `see_also`: AGENT_AFFORDANCES.md (data-agent-action verb catalog)

## verification

see LOCK_FILES.md

Last updated: 2026-07-12T00:00:00Z