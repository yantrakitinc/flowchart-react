# scripts/verify-mode-a — slice-on-commit verifier

## Concept

Verifier Mode A. Runs targeted gates against a single slice + stamps the lock on green.

Gates (in order):
1. Slice path exists + has `__specs__/`
2. Scoped vitest (`<slice>/__tests__/`)
3. Scoped eslint (`<slice>/`)
4. Project-wide typecheck (TypeScript graph can't scope cleanly)
5. PRIMARY RULE boundary greps inside the slice (direct DB-driver imports, @ts-ignore / @ts-expect-error, AuthorizedPrincipal cast bypass). All three greps `--exclude-dir=__tests__` (test files legitimately exercise these tokens). The DB-driver check matches actual import lines (`from "drizzle-orm"`, `from "drizzle-orm/<subpath>"`, `from "postgres-js"`, `from "postgres"`, `from "pg"`) — not bare identifiers like `getDb()` or `drizzleHandle`, and not `from "@/db/..."` (the typed boundary composition roots are supposed to use). Comment-line post-filter (drop JSDoc `*`, `/*`, `*/` and `//` lines) is per-grep — applied to `direct DB-driver imports` and `AuthorizedPrincipal cast` (mentions in JSDoc are documentation), but NOT to `@ts-ignore / @ts-expect-error` (the directive itself is a `//` comment by language design; filtering would neutralize the gate). Allowances: direct DB-driver imports permitted inside `src/db/` (drizzle-orm / postgres / pg legitimately live there); `as AuthorizedPrincipal` permitted inside `src/lib/authz/mint/` (the canonical brand-entry location).
6. Lock shape (`status: locked`, `verified: "100%"`, `last_validated` valid ISO-8601 UTC)
7. On all-green: stamp `standards-compliance.yaml` with `last_validated = <utc-now>`

Caller passes the slice path. Script exits 0 on SHIPPABLE, 1 otherwise.

## Files

1. `verify-mode-a.mjs` — entry point. Exports `main`, `cliMain`, `isCliInvocation`, `maybeRunCli`, plus per-gate helpers (`runScopedVitest`, `runScopedLint`, `runTypecheck`, `runBoundaryGreps`, `buildBoundaryGrepChecks`, `dropCommentLines`, `checkLockShape`, `stampLock`, `formatReport`, `hasSpecsFolder`, `hasTestsFolder`).

## Dependency injection — single spawn boundary

`main()` resolves the `spawn` port ONCE (`io.spawn ?? spawnSync`) and passes the resolved binding to every per-gate helper (`runScopedVitest`, `runScopedLint`, `runTypecheck`, `runBoundaryGreps`, plus `blastRadius`). The per-gate helpers therefore declare `spawn: typeof spawnSync` as a **required** field on their `io` object — no `?? spawnSync` fallback at each call site. Funnelling every PATH lookup through one binding keeps the test surface tiny: a test supplies one fake `spawn` and every gate is driven through it.

The lock-shape parser uses `^([a-z_]+):\s*(.*)$` (capture group `(.*)` — empty value is legal); `vRaw` is then trimmed + quote-stripped directly. The earlier `(.+)` form rejected legitimate empty scalars and produced a dead `(vRaw || "")` guard.

## Out of scope

- Blast-radius detection (callers / callees beyond the slice itself) — Mode A operates on the slice as-is for now.
- Manual playbook execution — that lives in the verifier agent's orchestration.
- Cross-feature side-effect detection — Mode D's job.
