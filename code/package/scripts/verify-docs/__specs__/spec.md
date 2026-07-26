# scripts/verify-docs — unified documentation verifier

## Concept

The script enforces the shape of human-readable documentation across the codebase:

- **Per-folder landing-zone checks.** Every `__specs__/` directory carries `spec.md`. Module-level `__specs__/` (under `src/features/<m>/__specs__/`) carries either `CODE_CONFIDENCE.md` (legacy scorecard) OR `standards-compliance.yaml` (the new SPEC_CONTRACT lock). A `__specs__/flows/` directory, when present, must carry at least one flow doc — either `.flow.md` (legacy) or `.flow.yaml` (new shape).
- **Per-file shape checks.** `spec.md` files must have at least one heading, no duplicates, no empty sections. NEW-form specs (detected by `## Invariants` + `## Permissions used`) get the full SPEC_TEMPLATE.md canonical-heading enforcement. `*.flow.md` files must carry NEW-form headings or at least one LEGACY heading; mermaid blocks required where headings call for them; YAML frontmatter restricted to an allowlist. `CODE_CONFIDENCE.md` files must carry 10 gate rows + "Overall confidence:" + no ❌.

**Dual-shape policy.** `.flow.yaml` files are recognised at the folder level (a flows folder with only `.flow.yaml` docs is NOT empty) but are NOT validated by this script — their schema lives in FLOW_CONTRACT.yaml and is enforced by the standards-compliance lock gate. The new `standards-compliance.yaml` lock file ALSO satisfies the module-level scorecard requirement (it supersedes `CODE_CONFIDENCE.md`).

**Transitional carve-out.** Paths inside `__specs__.backup/` are skipped entirely. They are the parking spot for legacy `spec.md` + `*.flow.md` content while a feature is being retrofitted to the new `spec.yaml` + `*.flow.yaml` shape; the carve-out keeps the verify chain green during the migration.

## Files

1. `verify-docs.mjs` — entry point. Exports the parsing helpers (`extractH2`, `sectionBodies`, `extractFrontmatter`, `splitFrontmatter`, `parseFrontmatterKeys`, `isNewFormSpec`, `isNewFormFlow`), the per-file checkers (`checkSpecMd`, `checkFlowMd`, `checkCodeConfidenceMd`), the folder checker (`checkSpecsFolder`), `audit`, `formatReport`, `main`, `cliMain`, `isCliInvocation`, `maybeRunCli`.

`splitFrontmatter(src)` returns `{ frontmatter, body }` in one pass. `checkFlowMd` uses it instead of running `extractFrontmatter` + a separate `indexOf("\n---\n", 4)` to compute the post-frontmatter body — the previous shape's second-indexOf guard was unreachable and uncovered.
2. `__tests__/verify-docs.test.mjs` — Vitest suite. Every helper has at least one passing AND one failing fixture; per-file coverage hits 100/100/100/100.
3. `__specs__/spec.yaml`, `__specs__/spec.md`, `__specs__/flows/*.flow.yaml`, `__specs__/manual/verify-docs.yaml`, `__specs__/standards-compliance.yaml`.

## Out of scope

- Validating `.flow.yaml` content (covered by SPEC_CONTRACT + verify-standards-compliance).
- Validating `spec.yaml` content (covered by SPEC_CONTRACT).
- Enforcing presence of `standards-compliance.yaml` itself — that's `verify-standards-compliance` (which walks and reports missing locks separately).
- Auto-fixing broken docs. The script reports; the operator fixes.

## Output contract

- stdout (success): `verify-docs: OK (<F> __specs__ folder(s); <X> spec.md, <Y> flow.md, <Z> CODE_CONFIDENCE.md checked)`
- stderr (failure): one summary line plus one issue per line:
  - `  <issue text>`
- Exit code: 0 on success, 1 on any issue.
