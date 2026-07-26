# AUTHORIZATION_STANDARDS — detail

Why each rule in `AUTHORIZATION_STANDARDS.md` exists.

## Why this standard exists at all

A single database query that touches user-owned data without a verified permission check is a data leak — present, not theoretical. The history of breached apps is mostly the history of forgetting to add a `WHERE owner_id = ?` clause, or adding it once and refactoring it away. Application-code-only checks aren't enough; humans forget to apply them.

So the rule is two-layer: a compile-time check that refuses to build code without permission types, AND a runtime check that refuses queries that don't match the row-level policy. Both layers must fail for data to leak. That's the bar.

## Why Layer A is a TypeScript branded type

A branded type (`iAuthorizedPrincipal<TSlug>`) is the cheapest possible compile-time check. The principal can't be constructed by ad-hoc object literals — it must come from the `mintPrincipal` producer, which does the actual auth verification. Once you have one, its type literally encodes which permission slugs the caller has.

Repository methods take `iAuthorizedPrincipal<"users:read">` (or whatever slugs they need); calls from a route handler that hasn't verified those slugs won't type-check. The TypeScript compiler becomes the first line of defense.

The `<TSlug>` generic is the load-bearing part. A generic of `string` would allow any string; that's the bypass we're closing. By forcing the function author to list the literal slugs they consume — `iAuthorizedPrincipal<"users:read" | "users:list">` — the reviewer (human or agent) can grep for the type signature and see exactly what each function is allowed to touch.

## Why Layer B is Postgres RLS via a YAML DSL

Layer A is bypassable. A raw SQL string outside the typed query layer skips it. A `vi.fn()` substitution in a test skips it. A future engineer adding an ad-hoc tool skips it. So a second layer enforces at the database level.

Postgres RLS sits below every query the database receives. The application connects through a role that has no bypass privileges. Every SELECT/INSERT/UPDATE/DELETE is filtered by predicates derived from session GUCs (`app.current_principal_id`, etc.) — and the GUCs are set by a `withPrincipal(client, principal, callback)` bridge that the typed query layer calls. Layer A's `iAuthorizedPrincipal` flows into Layer B's GUC; both layers agree on the same principal.

**Why a YAML DSL on top of RLS instead of hand-written SQL:**

1. **Consistency with the rest of the regiment.** Every other contract in `__specs__/` is declarative YAML — spec.md, openapi.yaml, asyncapi.yaml, standards-compliance.md (manual flows are the one markdown contract). Permission rules in raw SQL would be the lone exception.

2. **Agent-readability.** A chat agent reasoning "can principal X do Y to Z?" reads a YAML rule file far more reliably than parsing scattered `CREATE POLICY` SQL across migrations. The agent doesn't need to be a SQL expert.

3. **Auditability.** Rules in one file, diff-able, version-controlled with `version:` markers. SQL policies across migrations are harder to audit at a glance.

4. **Compile-step catches drift.** The DSL→SQL compiler asserts every referenced slug exists in the `permissions` catalog and every table exists in the schema. Hand-written SQL drifts; generated SQL doesn't.

5. **The compiler is straightforward.** A small TS script walks the YAML, emits `CREATE POLICY` SQL, applies via a Drizzle migration. Hundreds of lines, not thousands.

## Why the condition grammar is restricted

The DSL deliberately doesn't expose full SQL. It exposes:
- Boolean ops (AND, OR, NOT).
- Context refs (`ctx.principal_id`, `ctx.slugs`, `ctx.role`, `ctx.actor_type`).
- Row refs (`row.<col>`).
- Other-table lookup helpers (`lookup(other_table, key=value).col`).
- Comparison operators.
- Sugar helpers (`has_slug(slug)`, `same_tenant_as(row)`).

Restricting the grammar means:
- The compiler is finite. We're not implementing a full SQL parser.
- The rules are agent-readable. A chat agent reasoning about a rule doesn't need to interpret arbitrary SQL.
- Edge cases are bounded. Adding new operators is a deliberate DSL version bump.

If a rule genuinely needs SQL not expressible in the DSL, that's a signal — extend the DSL (add a helper) or simplify the rule. Don't drop down to raw SQL.

## Why two actor kinds (users + service_principals) is universal

Most projects start human-only. Then a cron job needs to write data. Then a worker needs to read. Then a webhook needs to insert. Then an AI agent needs to act on someone's behalf. Each of those is "a non-human actor" — and shoehorning them through the `users` table introduces "is this row a real person?" checks that constantly leak.

Separating from day one means:
- Humans go through human auth flows (passwords, OIDC, WebAuthn).
- Services authenticate with API keys (Bearer tokens stored as Argon2id hashes).
- Roles are typed by actor kind — a "super_admin" human role and a "cron-runner" service role don't share a pool.

The cost of this from day one is one extra table + a column on `roles`. The cost of retrofitting later is a major migration plus every existing query getting an extra check.

## Why ONE permission catalog with `assignable_to`

Permissions are facts about the system ("users can be read"). Roles are bundles for one actor kind. The catalog is shared; the roles are not.

`assignable_to: "user" | "service" | "both"` constrains which actor kind can hold a slug. Most permissions are `"both"`. A few are `"service"`-only — operations no human should ever do directly (e.g., `seed:super-admin`, `outbox:relay`). A few are `"user"`-only — operations no robot should do (rare; mostly the `ui:*` family if it ever exists).

The structural lock on `seed:super-admin` is the key — by tagging it `"service"`, NO human role can hold it. The bootstrap is one-shot by design, not by convention.

## Why roles are NOT shared

A role is FOR one kind of actor. "super_admin" for a human means "elevated user with broad oversight." "cron-runner" for a service means "this specific worker that runs job code." Confusing the two — by sharing the role pool — is the kind of mistake the UI eventually makes ("which roles can I assign to this user? all 47 of them, including the ones meant for crons?").

Three Postgres-level constraints make this structural rather than convention:

1. `user_roles` table only references roles where `actor_type = "user"`.
2. `service_principal_roles` only references roles where `actor_type = "service"`.
3. `role_permissions` enforces `actor_type` ↔ `assignable_to` compatibility via composite FK + CHECK constraint.

Postgres rejects bad grants on INSERT. No triggers, no app-level workarounds.

## Why the bootstrap chain is a universal pattern

Every system with authentication has the chicken-and-egg problem: the FIRST authenticated user has to be created BY someone — and that someone has to have permissions to create users. Three approaches:

1. **Manual SQL insert by the DBA.** Doesn't work for SaaS; the DBA isn't always available, and there's no audit trail.
2. **A "first user becomes admin" flag in code.** Race conditions on multi-pod deploys; insecure.
3. **A service principal that runs the seed, then disables itself.** Auditable, repeatable, structurally one-shot.

Approach 3 is the universal pattern. The system always has a permission-bearing identity to act under. The structural lock (`seed:super-admin` is `"service"`-only) means the seed can never be re-triggered by a human admin.

The bootstrap-seeder service principal is created by the foundation seed (running as Postgres superuser, the only entity that exists before app principals). It gets three grants: `users:write`, `user_roles:write`, `seed:super-admin`. The seed-super-admin route authenticates as it, mints a narrowed principal, creates the super-admin user, assigns the role, then flips `bootstrap-seeder.enabled = false`. After that, the next authentication attempt as the seeder fails closed.

## Why the 5 hard rules

1. **Every fn touching user-owned data takes `iAuthorizedPrincipal<TSlug>`.** Without this, the type system can't enforce. Every signature is the gate.
2. **TSlug lists EXACT slugs.** Wider unions defeat the type-check. Reviewers grep the type to see what the function can do.
3. **RLS policies land in the SAME migration as the table.** Otherwise tables ship without policies, gaps appear, Layer B is bypassable.
4. **New permission slugs ship via seed migration in the same PR as the consumer.** Otherwise the consumer's tests pass against a slug that doesn't exist in production.
5. **ESLint refuses the obvious bypasses.** Without this, future engineers (or agents under time pressure) take the shortcut and skip the type system.

Each rule closes a specific class of "we forgot" failure. Removing any one re-opens its class.

## Why the slug catalog is per-feature TypeScript

The catalog lives at `<feature>/db/permissions.ts` as a TS const array because:

1. Layer A's `iAuthorizedPrincipal<TSlug>` needs literal-string types at compile time — TS const arrays give them.
2. Discoverability + autocomplete + refactor safety on slug names.
3. The feature owns its slug declarations (self-containment, per `SOURCE_FOLDERS#per-feature-structure`).

## Why the RLS rules file is central (not per-feature)

`db/permissions-rules.yaml` is one central file while the slug catalog is per-feature:

1. RLS conditions frequently reference tables owned by OTHER features (joins, lookups) — a per-feature rule split forces awkward cross-folder rule placement.
2. Policy changes are auditable from one place (security review, compliance).
3. The YAML→SQL compiler runs once, against one input — no aggregation step for the rules themselves.
4. The slug CATALOG is per-feature; the RULES are central — best of both.

## Why Cloud SQL uses ENABLE without FORCE

`FORCE ROW LEVEL SECURITY` is the canonical permission-based-RLS directive on real PostgreSQL — it forces the table owner to also pass policies. On Cloud SQL, the `postgres` role is `cloudsqlsuperuser`, NOT a real PostgreSQL superuser, and does not have the `BYPASSRLS` attribute. SECURITY DEFINER functions that read RBAC catalog tables (e.g. `app_has_permission`) cannot execute their internal joins under FORCE because the catalog reads themselves fire FORCE policies. Cloud SQL does not permit granting BYPASSRLS or running ALTER ROLE for that attribute.

Consequently every application table declares `ENABLE ROW LEVEL SECURITY` only; FORCE is not used. The behavioural invariant — "every database mutation at runtime passes through `app_has_permission(current_principal_id, slug)`" — is preserved by Layer C (the verifier gate that keeps the owner pool out of runtime paths). The service app role (e.g. `identity_app`) is the only role used at runtime; it is non-owner, so ENABLE applies and every read / write fires the policies. The postgres pool bypasses by ownership but is structurally inaccessible at runtime.

## Why ESLint enforcement matters

The patterns ESLint blocks are the patterns that bypass Layer A:

- `as iAuthorizedPrincipal<...>` casts outside the producer-allowlist let arbitrary code construct a fake principal.
- Raw `sql\`...\`` template tags outside the DB layer skip the typed query interface entirely.
- Direct DB-driver imports outside the DB layer let any module reach for the database without going through the typed interface.

These are not paranoia; each is a known class of Layer A bypass. ESLint refuses the pattern at the moment of writing, before it can ship.

Last updated: 2026-07-11T00:00:00Z
