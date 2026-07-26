# API_ENVELOPE

> Every API response on every site uses ONE envelope — success and error alike, always with the correct HTTP status. Features change; the pattern never does. Base: JSend (the widely adopted status/data envelope), extended with the house error-code shape. RFC 9457 problem+json is NOT used — it covers only errors and switches media type, breaking envelope uniformity.

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## envelope

- `media_type`: application/json _(every response, including errors)_
- `success`: _(HTTP 2xx)_
  - `shape`: '{ "status": "success", "data": <payload | null> }'
  - `data`: the actual resource/result; null when the operation returns nothing
- `fail`: _(HTTP 4xx — caller problem (validation, auth, not-found, conflict))_
  - `shape`: '{ "status": "fail", "code": "<ERROR_CODE>", "message": "<human line>", "data": <field-errors | null> }'
- `error`: _(HTTP 5xx — server problem)_
  - `shape`: '{ "status": "error", "code": "<ERROR_CODE>", "message": "<human line>" }'
  - `never_leaks`: stack traces, SQL, internal paths — code + generic message only

## rules

- `no_endpoint_exempt`: every route handler returns the envelope — including 401/403/404/500, middleware rejections, and thrown-error catch-alls
- `http_status_always_correct`: the envelope NEVER substitutes for the right HTTP status; status field and HTTP status agree (success<->2xx, fail<->4xx, error<->5xx)
- `code_shape`: fail/error code follows NAMING.md error-code format; codes are stable API contract values documented in the feature's openapi.yaml
- `single_helper`: one shared respond() helper per repo builds the envelope; handlers never hand-assemble it (drift-proof)
- `openapi_documents_envelope`: every operation's responses in openapi.yaml show the envelope for every declared status

Last updated: 2026-07-12T00:00:00Z