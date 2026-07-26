# NAMING — detail

Why each rule in `NAMING.md` exists. Read this when changing a rule, or when a rule feels arbitrary and you need the load-bearing reason.

## Interface prefix, class suffix, file-by-role

The naming rules exist so that a symbol's name reveals its role:
- `iUser` is a type/interface (the lowercase `i` prefix is the marker — visible in a long line of TypeScript symbols).
- `AuthServiceClass` is a class (the `Class` suffix is the marker — distinguishes from constants/functions sharing the noun).
- `MAX_LOGIN_ATTEMPTS` is a literal constant (ALL_CAPS).
- `LoginForm.tsx` is a component (PascalCase + .tsx).
- `auth.service.ts` is a utility/service (dot-case lowercase).

## Error codes and data-testid shapes

Error codes use `{CATEGORY}_{FEATURE}_{ERROR}` — at least 3 ALL_CAPS segments. `LOGIN_BAD_CREDENTIALS` not `BAD_CREDS`. The 3-segment shape ensures category + feature + specific-error are all present; the agent reading a problem response can categorize without parsing prose.

`data-testid` uses `<feature>-<element>-<type>` — at least 3 kebab-case segments. `whoami-actor-id` not `actor-id`. Same reasoning: feature disambiguates, element identifies the role, type identifies the kind. Collision-free across the codebase.

## Primary keys

CUID2 is the primary-key type: collision-resistant, sortable-ish, URL-safe, no central coordination required.

Last updated: 2026-07-12T00:00:00Z
