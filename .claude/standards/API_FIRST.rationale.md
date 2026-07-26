# API_FIRST — why

## Why the API is the site

Every website ultimately CRUDs data. If every capability is API-reachable with
flows E2E-proven, the site is functionally COMPLETE with zero UI — and any
number of UIs (web, iOS, Android, console, AI agents) become thin clients over
the same tested surface. UI built before the mechanical site is airtight bakes
UI assumptions into half-built services.

## Why flows land with the API, not later

Flows written at API time capture the scenarios the API was built for while
they are known. Deferred flows degenerate into documentation of whatever got
built. The mermaid diagram forces the path graph to be explicit.

## Why an attestation file gates UI

"The APIs are done" is a claim; MECHANICAL_COMPLETE.yaml mapping every flow to
an existing E2E contract is a fact a script checks. Page-tier code is refused
until the map is total — the same no-honor-system shape as every other gate.

Last updated: 2026-07-12T00:00:00Z
