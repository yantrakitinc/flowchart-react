# scripts/verify-no-server-imports — G-CLIENT-SERVER-BOUNDARY

## Concept

Mechanical gate for the client↔server boundary in the single Next.js app (`PROJECT_ARCHITECTURE.yaml` `single_app_shape`). "Server" and "client" are layers, not packages.

Builds the import-closure of every `"use client"` entry under `src/` and fails if any **server-only** module is reachable from it. A module is server-only when it either imports the `server-only` package, or lives in a server-only layer:

- `src/db/**` — DB client, RLS bridge, migrations.
- `**/repositories/**` — data repositories.
- `src/features/<name>/{services,handlers}/**` — feature business logic.

The allowed client→server bridge is a Server Action (`actions/*.action.ts`, `"use server"`) or a route handler called over HTTP — never a direct import of the data / service / handler layer. Reaching server-only code from the client bundle would ship server code / secrets to the browser and make RULE 0's server-side authorization bypassable.

The gate is non-overridable per RULE 0 — there is no allow flag. The only way to relax it is to edit `PROJECT_ARCHITECTURE.yaml` `single_app_shape` in a committed PR with explicit human review.

## Files

1. `verify-no-server-imports.mjs` — entry point. Exports `collectFiles`, `resolveSpecifier`, `parseModule`, `isServerOnlyLayerPath`, `findViolations`, `runAudit`, `isCliInvocation`, `maybeRunCli`, `_constants`.

## How the closure is built

`parseModule` extracts each file's `"use client"` flag, `server-only` import, and raw import specifiers. `resolveSpecifier` maps `@/x` → `src/x` and `./x` / `../x` relative to the importing file, trying `.ts` / `.tsx` / `/index.ts` / `/index.tsx`; bare packages resolve to null (ignored). `findViolations` BFS-walks from each `"use client"` entry across resolved local imports; a server-only target is recorded as a violation and not traversed further.

## Out of scope

- Transitive resolution of dynamic `import()` expressions with computed specifiers — only string-literal specifiers are followed.
- Bare-package / `node:` imports — not local modules; ignored.
- The reverse direction (server importing client) — not a boundary risk in the RSC model.

## Output contract

- stdout (success): `[verify-no-server-imports] PASS — no server-only module is reachable from a "use client" entry.`
- stderr (failure): `G-CLIENT-SERVER-BOUNDARY violation: ...` + per-hit `  client <entry> reaches server-only <module>` + rule reference + non-override notice.
- Exit code: 0 on PASS; 1 on any violation.
