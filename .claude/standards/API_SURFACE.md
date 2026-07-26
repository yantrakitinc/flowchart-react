# API_SURFACE

> agent needs to APPLY and ENFORCE: server-action↔HTTP parity, /api/v1 versioning, runtime surfaces, and visibility gates. ---------- API surface ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## api_surface

- `rule`: every service method called by a Server Action MUST ALSO be exposed as an HTTP route
- `per_route_artifacts`:
  - "<feature>/__specs__/openapi.yaml" _(per-feature OpenAPI; schema owner: SPEC_CONTRACT.md)_
  - "<feature>/__specs__/manual/<flow>.md" _(browser-executable manual script; see MANUAL_FLOWS.md)_
- `versioning`:
  - `url_pattern`: "/api/v1/..."
  - `breaking_change`: bump to /api/v2/...
- `authorization`: see AUTHORIZATION_STANDARDS.md (Layer A + Layer B + YAML→RLS DSL)
- `runtime_surfaces`:
  - `"/openapi.json"`:
    - `auto_generated`: true
    - `source`: every <feature>/__specs__/openapi.yaml
    - `see`: AGENT_AFFORDANCES#agents-index
  - `"/docs"`:
    - `type`: Swagger UI dev + staging: visible
    - `production`: gated behind admin auth
- `visibility_gates`:
  - `ENABLE_ALL_API`:
    - `true`: 'ALL API routes reachable, including `visibility: "internal"`' false (default in production): internal routes return 404
  - `ENABLE_SWAGGER_FOR_ALL_API`:
    - `true`: Swagger UI lists ALL endpoints false (default in production): 'only `visibility: "public"` endpoints appear'
  - `local_dev_defaults`: both true
  - `production_defaults`: both false
  - `on_flip_in_production`: MUST emit an audit event on flip + flip-back
- `route_meta`:
  - `required_export`: "export const apiMeta = { visibility: 'public' | 'internal' } as const;"
  - `public`: always reachable + always in Swagger
  - `internal`: reachable only when ENABLE_ALL_API=true; in Swagger only when ENABLE_SWAGGER_FOR_ALL_API=true

Last updated: 2026-07-12T00:00:00Z