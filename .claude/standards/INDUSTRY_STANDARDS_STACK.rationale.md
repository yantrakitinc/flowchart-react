# INDUSTRY_STANDARDS_STACK — detail

Why each named standard in `INDUSTRY_STANDARDS_STACK.md` was picked, and the rule of preferring named standards over invented patterns.

## Why this standard exists at all

Inventing patterns is expensive. Inventing well-known patterns badly is worse. Every category below has a battle-tested, peer-reviewed, ecosystem-supported standard that already exists. Picking it costs nothing; inventing a worse version costs the project's lifetime maintenance budget.

So: every new design decision first asks "what's the named industry standard for this?" If one exists, use it. If none fits, invent — and justify why in the spec.

The detail below covers WHY each specific standard was picked over alternatives.

## HTTP API

- **OpenAPI 3.1** — industry's settled-upon HTTP-contract format. Tooling (Swagger, Redocly, generators) treats it as canonical. 3.1 specifically because it aligns with JSON Schema 2020-12 (used for `data` columns).
- **RFC 7807 Problem Details** — universal error response shape (`type`, `title`, `status`, `detail`, `instance`). Bespoke error JSON is a per-team bikeshed; RFC 7807 makes the wire shape predictable for clients.
- **Idempotency-Key (Stripe convention)** — every state-changing endpoint accepts an `Idempotency-Key` header and dedupes on the server. Saves the "double-click submitted twice" class of bug.
- **Stripe API design patterns** — pagination uses `limit` + `starting_after` (cursor, not offset). Versioning by date stamp. Expandable fields. CRUD shape. Stripe's API is the closest thing to a public textbook on HTTP API design at scale.

## Events

- **AsyncAPI 3.0** — OpenAPI's counterpart for async/event-driven contracts. Same tooling story, different transport.
- **CloudEvents v1.0** — universal event envelope. Every event carries `specversion`, `type`, `source`, `id`, `time`, `datacontenttype`, `data`. Producers + consumers agree on the envelope without negotiating per-system.
- **Transactional Outbox Pattern** — events are emitted by INSERTing into an `outbox` table in the same transaction as the state change. A separate publisher process relays from outbox to the event bus. Solves the "event sent but transaction rolled back" / "transaction committed but event dropped" dual-write problem.

## Authentication

- **OAuth 2.1** — supersedes 2.0; banned the insecure flows (implicit, password grant). Auth Code + PKCE is the default for human flows; Client Credentials for service-to-service.
- **OIDC** — identity layer on top of OAuth. Provides standardized id tokens, userinfo endpoint, discovery.
- **WebAuthn / FIDO2 / passkeys** — passwordless. Default for new human-auth surfaces because (a) phishing-resistant, (b) better UX than passwords, (c) browser-supported everywhere.
- **NIST SP 800-63B** — Authenticator Assurance Levels (AAL1/2/3). Defines what counts as "secure enough" for each tier.
- **Argon2id (RFC 9106)** — password hashing. Memory-hard, side-channel resistant, the post-bcrypt consensus winner.
- **PASETO v4** preferred over JWT — JWT has algorithm-confusion bugs + the "none" algorithm trap. PASETO fixes these by versioning the crypto and removing the algorithm field.
- **SCIM 2.0** — cross-system user provisioning. Mostly relevant when integrating with enterprise IdPs (Okta, Azure AD).

## Authorization

- **NIST RBAC** — Role-Based Access Control. Roles bundle permissions; users get roles. The classic baseline.
- **Google Zanzibar / OpenFGA / SpiceDB** — ReBAC (Relationship-Based Access Control). For when "user X owns document Y" relations get too complex for flat role bundles. Adopt when the relationship complexity earns it.

Detailed two-layer authorization architecture (Layer A compile-time + Layer B Postgres RLS + YAML→RLS DSL) lives in `AUTHORIZATION_STANDARDS.md`.

## Audit-log integrity

Stricter requirements apply to anything that calls itself an audit log:

- **NIST SP 800-92** — log management guide. Coverage of retention, integrity, monitoring.
- **PCI DSS Requirement 10** — track + monitor all access to cardholder data and security systems. Even if no card data flows, the discipline is reusable.
- **SOC 2 CC4.1 / CC6.1** — monitoring + audit Trust Services Criteria.
- **Hash chaining (Merkle / Certificate Transparency style)** — per-tenant chain; each entry references previous via SHA256. Tamper-evident: changing entry N requires rewriting every subsequent entry.
- **WORM (Write-Once Read-Many)** — enforced at the SQL grant level. The app's user has INSERT but no UPDATE/DELETE. Even a successful SQL injection can't tamper.
- **RFC 5424** — syslog severity + facility. Common SIEM tools (Splunk, Datadog, Elastic) ingest RFC 5424 cleanly.

## Compliance

Floor every primitive meets:

- **SOC 2 Type II** — security mandatory. Availability + Confidentiality + Privacy added as scope grows.
- **GDPR** — Articles 5 (lawfulness), 6 (legal basis), 7 (consent), 15-22 (data subject rights), 25 (data protection by design), 30 (records), 32 (security), 33 (breach notification), 35 (impact assessments).
- **CCPA / CPRA** — California consumers. Largely overlapping with GDPR in spirit; check separately because the consent + opt-out mechanics differ.
- **OWASP ASVS Level 2** — engineering bar. Above ASVS L1 (cautious-but-not-paranoid); below L3 (high-security). L2 is the standard floor for SaaS.
- **CIS Benchmarks** — hardening for Postgres, Linux, Docker, K8s. Pre-built checklists.
- **ISO 27001 + 27701** — if formal certification ever needed.
- **PCI DSS** — only relevant if a primitive ever touches card data. Default: NEVER touch card data; use Stripe-hosted forms.
- **HIPAA** — out of current scope.
- **NIST Privacy Framework + NIST SP 800-122** — PII handling baseline.

## Observability

- **OpenTelemetry** — vendor-neutral telemetry standard. Traces + metrics + logs in one SDK. Backend can be Datadog, Honeycomb, Tempo, etc.
- **OpenTelemetry Semantic Conventions** — standardized attribute names (`http.method`, `db.system`, etc.) so cross-service queries work without per-service translation.

## Deployment

- **The Twelve-Factor App** — the original SaaS-deployment checklist. Config in env, stateless processes, etc.
- **HashiCorp Vault OR cloud-native KMS** — secrets management. Don't roll your own.
- **Postgres RLS** — runtime authorization. Already in `AUTHORIZATION_STANDARDS.md` as Layer B.
- **Drizzle ORM + postgres-js** — repository convention. Type-safe, schema-first, no codegen.
- **pglite** — in-memory Postgres for unit tests. Real Postgres for integration tests + production.

## Data modeling

- **CUID2** — collision-resistant, sortable-ish, URL-safe, no central coordination. The primary-key type for new tables (not UUID).
- **`timestamp with time zone`** — every Postgres timestamp column. The DB stores UTC; the type carries the timezone information.
- **JSON Schema (draft 2020-12)** — structured JSON columns get a schema. The schema lives in `__specs__/openapi.yaml` if the column is a request/response shape, or in a colocated `.schema.json` if internal.

## The rule

The hard line: name the standard, never invent. The exception path is real but narrow: if no established pattern fits, invent — and justify why in the spec. The justification gets reviewed alongside the rest of the spec. "We invented a new thing because we felt like it" is not a justification.

Last updated: 2026-05-20T04:06:03Z
