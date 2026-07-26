# scripts/verify-mode-cleanup-orphans — orphan + catalog mismatch detector

## Concept

Verifier Mode Cleanup-Orphans. Inspection-tier mode that reports two classes of drift:

1. **Orphan locks.** A `__specs__/standards-compliance.yaml` exists, but the owning slice folder has no source files / sub-folders OTHER than the meta directories (`__specs__`, `__tests__`, `__stories__`, `__manual__`). The most common cause: source was renamed or deleted, but the spec/lock survived.

2. **Catalog mismatches.** The slice's `spec.yaml` declares a `feature_name` that does not correspond to the slice folder's path. Catches drift between the spec catalog and the on-disk layout.

Report-only — does NOT modify the working tree. The operator removes orphans via git (or reconciles the catalog by hand).

## Files

1. `verify-mode-cleanup-orphans.mjs` — entry point. Exports `sliceHasSource`, `extractFeatureName`, `main`, `cliMain`, `isCliInvocation`, `maybeRunCli`.

## Dependency injection

`findLocks`, `sliceHasSource`, `extractFeatureName`, `readDir`, `write` are all injection ports — same shape as the other modes. `META_DIRS` is the exclusion set for `sliceHasSource`.

## Out of scope

- Auto-deletion of orphans (operator removes via git).
- Catalog rewrite (operator reconciles).
- Validation gates (B / B.5 / D / F / F-Random).
- Stamp updates (A / C / E).
