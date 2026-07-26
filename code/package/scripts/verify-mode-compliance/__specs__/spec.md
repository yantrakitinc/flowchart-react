# scripts/verify-mode-compliance — orchestrator for the verify chain

## Concept

`pnpm verify` aggregates every gate that protects the codebase: doc shape, source-coverage, migration replay, tenant indexes, standards-compliance lock files, ESLint permission rules, manual playbooks, source-coverage, padding folders, the permission aggregator, and the chat-agent manifest generator. The orchestrator wires those gates into a two-phase DAG:

- **Phase 1 — read-only checks.** Every verifier that only inspects the working tree. The orchestrator runs these in a capped-concurrency pool (6 workers by default) so the wall-clock collapses to roughly the slowest single gate plus a small queue tail.
- **Phase 2 — writers.** `aggregate-permissions` rewrites `public/agents-permissions.json`; `generate-agents-json` rewrites `public/agents.json`. They run sequentially after Phase 1 so the manifest the agent emits sees a clean tree.

Per-script output is captured into a per-script buffer and replayed in deterministic catalog order after each phase. The operator never sees interleaved logs.

**Modes**:

- `pnpm verify` — every Phase-1 entry except the slow freshness gate, plus both Phase-2 writers.
- `pnpm verify --scope` — same orchestration, but each script's *territory* is intersected with the list of changed paths (`git diff --diff-filter=ACMRT origin/master --`). Scripts whose territory is disjoint are skipped with a one-line `SKIP <id> (<reason>)` notice. When git cannot produce a path list (missing binary / no upstream / clean tree), the run degrades gracefully to a full run with a one-line stderr note.
- `pnpm verify:full` — adds `verify-standards-freshness` to Phase 1.

## Files

1. `verify-mode-compliance.mjs` — entry point. Exports `SCRIPTS`, `DEFAULT_PER_SCRIPT_TIMEOUT_MS`, `parseArgs`, `planRun`, `buildCommand`, `defaultRunChild`, `runOne`, `runInPool`, `replayResults`, `buildSuffix`, `main`, `cliMain`, `isCliInvocation`, `maybeRunCli`. `defaultRunChild` accepts an `options.spawn` injection AND an `options.killTimeoutMs` (default 5000ms — the SIGTERM→SIGKILL escalation interval) so the timeout / SIGKILL escalation path can be exercised by tests in ~5ms without real-time waits.
2. `__tests__/verify-mode-compliance.test.mjs` — Vitest suite. Every helper has at least one passing AND one failing fixture; per-file coverage hits 100 lines / ~99 branches / ~94 functions / 100 statements (the missing function branches are the default-port `??` fallbacks in `cliMain` that would require spawning the real catalog).
3. `__specs__/spec.yaml`, `__specs__/spec.md`, `__specs__/flows/*.flow.yaml`, `__specs__/manual/verify-mode-compliance.yaml`, `__specs__/standards-compliance.yaml`.

## Territory predicates

Each `SCRIPTS` entry carries a `territory(changed): boolean` predicate that decides whether a `--scope` run should include the script. The mapping (script → territory):

| Script | Territory |
|---|---|
| verify-flow-coverage | any spec.yaml OR .ts/.tsx in src/ |
| verify-docs | any __specs__/ file |
| verify-no-stray-scaffolding | any /src/ file |
| verify-setup-headers | any .ts/.tsx in src/ |
| verify-manual-playbooks | any __specs__/manual/ file |
| verify-eslint-permission-rules | ALWAYS |
| verify-migration-replay | src/db/migrations/ |
| verify-tenant-indexes | src/db/schema/ |
| verify-standards-compliance | any __specs__/ file |
| verify-source-coverage | ALWAYS |
| verify-no-padding-folders | src/features/ |
| verify-standards-freshness (only when --full) | any __specs__/ file |
| aggregate-permissions | any permissions.ts |
| generate-agents-json | any spec.yaml |

## Out of scope

- Validating per-script behaviour — each gate carries its own `__specs__/` and tests.
- Auto-fixing gate failures — the orchestrator reports; the operator (or a follow-up coder pass) fixes.
- Building the territory list dynamically — predicates are codified in `SCRIPTS` to keep the catalog one read.
- External concurrency libraries — the worker pool is ~30 lines of plain Node.

## Output contract

- stdout (success, default): `verify-mode-compliance: OK (all <N> scripts passed) in <S>s`
- stdout (success, --full): `verify-mode-compliance (full): OK (all <N> scripts passed) in <S>s`
- stdout (success, --scope): `verify-mode-compliance (scoped): OK (<R> of <T> scripts ran, <K> skipped) in <S>s`
- stderr (failure): one summary line plus one `FAIL: <id> (exit <code>)` line per failure
- Exit code: 0 when every script that ran exited 0; 1 otherwise.
