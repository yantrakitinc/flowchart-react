# scripts/verify-flow-coverage — flow-doc coverage verifier

## Concept

The script asserts the structural promise that every exported behavior in `src/` has a co-located flow doc inside its feature's `__specs__/flows/` directory. Without that, the AI chat agent's crawl cannot find documented input / output / failure paths for that function — the export is effectively undocumented.

**Dual-shape policy.** During the migration from the legacy `.flow.md` shape (CODE_CONFIDENCE-style markdown) to the new SPEC_CONTRACT `.flow.yaml` shape (machine-readable map), BOTH extensions are accepted. A folder is compliant when one OR the other exists for each exported behavior. New work writes `.flow.yaml`; legacy `.flow.md` is grandfathered until each feature is retrofitted.

For each behavior named `fooBar`, the script tries every kebab-cased candidate (`foo-bar.flow.yaml`, `foo-bar.flow.md`, plus acronym-collapsed forms like `register-openapi.flow.yaml` for `registerOpenAPI`). If at least one candidate exists, the export is covered.

## Files

1. `verify-flow-coverage.mjs` — entry point. Exports `isInScope`, `flowDocCandidates`, `audit`, `formatReport`, `main`, `cliMain`, `isCliInvocation`, `maybeRunCli`.
2. `__tests__/verify-flow-coverage.test.mjs` — Vitest suite. Drives every helper via dependency-injected IO so the suite reaches 100/100/100/100 per-file coverage without spawning a process for most cases.
3. `__specs__/spec.yaml`, `__specs__/spec.md`, `__specs__/flows/*.flow.yaml`, `__specs__/manual/verify-flow-coverage.yaml`, `__specs__/standards-compliance.yaml`.

## Out of scope

- Validating the SHAPE of a flow doc — that's `verify-docs` (legacy `.flow.md` headings) and the SPEC_CONTRACT spec.yaml gate (new `.flow.yaml` schema).
- Validating that the linked flow doc points at the right source file. (Frontmatter cross-check is a separate concern.)
- Auto-generating flow docs for missing behaviors. The script reports; the operator (or AI agent) writes the doc.

## Output contract

- stdout (success): `verify-flow-coverage: OK (<N> exported behavior(s) checked)`
- stderr (failure): one summary line plus one MISSING line per uncovered behavior:
  - `  MISSING: <flows-dir>/{<candidate1> | <candidate2> | ...} for export <name> in <source-file>`
- Exit code: 0 on success, 1 on any uncovered behavior.
