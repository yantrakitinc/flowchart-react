# STACK

> Rationale for every rule: STACK.rationale.md. ---------- stack (Next.js-first; per-project override allowed with a documented reason) ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## stack

- `framework`: Next.js (App Router)
- `ui`: React + Tailwind v4 (+ @tailwindcss/postcss) _(token discipline: DESIGN_TOKENS#tailwind)_
- `language`: TypeScript (strict) _(hygiene rules: TYPESCRIPT_HYGIENE#typescript)_
- `database`: PostgreSQL _(MongoDB allowed for projects that justify it)_
- `orm`: Drizzle ORM + postgres-js
- `test_db`: pglite _(in-memory Postgres for unit; real Postgres for integration)_
- `auth_tokens`: PASETO v4 (HttpOnly cookie; never JS-readable storage)
- `password_hashing`: Argon2id (RFC 9106)
- `logger`: Pino _(usage rules: LOGGING#logging)_
- `package_manager`: pnpm
- `override_rule`: a project may pick a different stack item if the spec documents the reason
- `see`: INDUSTRY_STANDARDS_STACK.md _(named-standard catalog)_

## see_also

- `agent_standards`: SPEC_CONTRACT.md + FLOW_CONTRACT.md + MANUAL_FLOWS.md + AGENT_AFFORDANCES.md # spec.md / flows / manual / data-* attributes
- `standards_compliance`: LOCK_FILES.md # per-feature lock + freshness gate (the only verify script)
- `cross_cutting_concerns`: SPEC_CONTRACT#cross-cutting-declaration _(WCAG / auth / mobile / i18n)_
- `authorization_standards`: AUTHORIZATION_STANDARDS.md _(Layer A + Layer B + YAML→RLS DSL + actor model + bootstrap chain)_
- `process_discipline`: PROCESS_DISCIPLINE.md _(scope / defects / order / DB hygiene / decision boundary)_

## verification

see LOCK_FILES.md _(the only standards-verify script + manual walk)_

Last updated: 2026-07-12T00:00:00Z