# scripts/verify-mode-pristine — code-health proof gate

## Concept

Verifier Mode Pristine. Five-stage code-health proof:

1. `pnpm typecheck`
2. `pnpm build`
3. `pnpm lint`
4. `pnpm test` (unit)
5. `pnpm e2e` (optional — skipped if the `e2e` script is missing from package.json)

Stages run in sequence; first non-zero stops the chain. No spec/lock involvement. Mode Pristine answers the question "is the code currently shippable?" independent of any standards-compliance lock state.

Composed with Mode Compliance to produce Mode Pristine+Compliance — the full pre-merge gate.

## Files

1. `verify-mode-pristine.mjs` — entry point. Exports `DEFAULT_STAGES`, `main`, `cliMain`, `isCliInvocation`, `maybeRunCli`.

## Dependency injection

`stages` defaults to `DEFAULT_STAGES` (the five above). Tests / orchestrators inject a reduced set or a stub spawn. `pnpm` (the binary name) and `cwd` (the working directory) are also injectable for portability.

`spawn` failures on optional stages (e.g., e2e on a project without playwright installed) are logged + skipped without failing the run.

## Out of scope

- Per-stage retry logic (operator re-runs the specific stage).
- Stamp validation / update (other modes).
- Deep ceremony coordination (Mode Verify-All).
