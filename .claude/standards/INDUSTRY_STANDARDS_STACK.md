# INDUSTRY_STANDARDS_STACK

> Every new design decision FIRST reaches for the named industry standard below. If a standard fits, cite it in the spec and use it. Inventing a pattern that already has a named standard is a code-review failure. ---------- HTTP API contracts ----------

```meta
version: 1
last_updated: 2026-05-20T04:06:03Z
```

## http_api

- `openapi`: "OpenAPI 3.1" _(single source of truth for every HTTP route)_
- `errors`: "RFC 7807 — Problem Details for HTTP APIs"
- `idempotency`: "Idempotency-Key HTTP header (Stripe convention)"
- `patterns`: "Stripe API design patterns" _(pagination (limit + starting_after), versioning, expandable fields, CRUD)_

## events

- `contract`: "AsyncAPI 3.0"
- `envelope`: "CloudEvents v1.0" _(specversion / type / source / id / time / datacontenttype / data)_
- `delivery`: "Transactional Outbox Pattern" _(emit by inserting into outbox in SAME transaction as state change)_

## auth_n

- `authorization_flows`: "OAuth 2.1" _(Auth Code + PKCE; Client Credentials for service-to-service; NO implicit, NO password grant)_
- `identity_tokens`: "OIDC"
- `passwordless`: "WebAuthn / FIDO2 / passkeys" # default for new human-auth paths
- `assurance_levels`: "NIST SP 800-63B"
- `password_hashing`: "Argon2id (RFC 9106)"
- `bearer_tokens`: "PASETO v4 (preferred) OR JWT (RFC 7519)"
- `cross_system_provisioning`: "SCIM 2.0" _(B2B; later)_
- `service_principal_key`: "API key as Bearer; stored as argon2id hash"

## auth_z

- `rbac`: "NIST RBAC"
- `rebac`: "Google Zanzibar / OpenFGA / SpiceDB" # adopt when relationship-based access surfaces
- `see`: AUTHORIZATION_STANDARDS.md _(Layer A + Layer B + YAML→RLS DSL)_

## audit

- `log_management`: "NIST SP 800-92"
- `access_tracking`: "PCI DSS Requirement 10"
- `trust_services`: "SOC 2 CC4.1 / CC6.1"
- `tamper_evidence`: "Hash chaining (Merkle / Certificate Transparency style)" _(per-tenant chain; each entry references previous via SHA256)_
- `write_only`: "WORM" _(INSERT-only at SQL grant level; no UPDATE / DELETE)_
- `syslog`: "RFC 5424"

## compliance

- `soc2`: "SOC 2 Type II" _(Security mandatory; Availability + Confidentiality + Privacy as scope grows)_
- `gdpr`: "GDPR Articles 5, 6, 7, 15-22, 25, 30, 32, 33, 35"
- `california`: "CCPA / CPRA"
- `engineering_bar`: "OWASP ASVS Level 2"
- `hardening`: "CIS Benchmarks" _(Postgres, Linux, Docker, K8s)_
- `iso`: "ISO 27001 + 27701" _(if formal certification later)_
- `pci`: "PCI DSS SAQ A only if a primitive ever touches card data" _(default NEVER (Stripe-hosted forms only))_
- `hipaa`: out of current scope
- `privacy`: "NIST Privacy Framework + NIST SP 800-122"

## observability

- `unified_telemetry`: "OpenTelemetry" _(traces + metrics + logs across all primitives)_
- `attribute_names`: "OpenTelemetry Semantic Conventions"

## deployment

- `twelve_factor`: "The Twelve-Factor App (12factor.net)"
- `secrets`: "HashiCorp Vault OR cloud-native KMS"
- `database_security`: "Postgres RLS" _(runtime layer of two-layer security; non-bypassable)_
- `orm`: "Drizzle ORM + postgres-js"
- `test_db`: "pglite" _(in-memory Postgres for unit tests; real Postgres for deploy-integration)_

## data

- `primary_keys`: "CUID2 (@paralleldrive/cuid2)"
- `timestamps`: "timestamp with time zone"
- `structured_json`: "JSON Schema (draft 2020-12)"

## rule

name the standard, never invent

## exception

invent only when no established pattern fits, AND justify why in the spec

Last updated: 2026-05-20T04:06:03Z