# scripts/verify-setup-headers — SETUP-marker verifier

## Concept

The script enforces a two-way contract around the `SETUP FILE.` header
that flags architecturally-important, rarely-edited code:

- Every file matching the SETUP convention MUST carry the marker.
- Every file carrying the marker MUST match the convention (no rogue
  files self-declaring as setup).

The convention has three rules:

1. Any file literally named `types.ts` (pure interface-port files).
2. Any file directly under a `schemas/` folder (Drizzle pure-DDL
   contracts), excluding `__tests__/` / `__specs__/` artifacts.
3. Any file path matching one of the explicit globs in `SETUP_GLOBS`
   (concrete adapters, composition roots, seed CLIs, root scaffolding,
   etc.). The glob list is the editable single source of truth — when a
   new pattern joins the SETUP family, add it here, not as a hand-listed
   path.

Glob semantics are minimal shell-style:

- `*` matches any run of characters except `/`.
- `**` (bare) matches any run of characters including `/`.
- `**` + `/` (a doublestar-slash segment) matches zero-or-more directory
  segments — including the empty case, so `lib/config/**/*.ts` matches
  both `lib/config/foo.ts` and `lib/config/sub/foo.ts`.

The header check looks only at the first ~30 lines so a body comment
can't satisfy the gate.

## Files

1. `verify-setup-headers.mjs` — entry point. Exports the constants
   (`SETUP_GLOBS`, `SETUP_REGEXES`), the pure helpers (`globToRegex`,
   `classify`, `hasSetupHeader`, `isCandidateSourceFile`), the
   audit / formatting / driver layer (`audit`, `formatReport`, `main`,
   `cliMain`, `isCliInvocation`, `maybeRunCli`), and the default IO
   ports (`defaultListAllFiles`, `defaultReadFile`, `defaultExistsSync`,
   `defaultStdoutWrite`, `defaultStderrWrite`).
2. `__tests__/verify-setup-headers.test.mjs` — Vitest suite. Drives
   every helper via dependency-injected IO so the suite reaches
   100/100/100/100 per-file coverage without spawning a process.
3. `__specs__/spec.yaml`, `__specs__/spec.md`,
   `__specs__/flows/*.flow.yaml`, `__specs__/manual/verify-setup-headers.yaml`,
   `__specs__/standards-compliance.yaml`.

## Out of scope

- Validating WHICH globs belong in `SETUP_GLOBS`. Editing the list is a
  code review judgement call; this script enforces consistency once an
  edit lands.
- Enforcing other top-of-file conventions (license headers, JSDoc
  preludes). The single `SETUP FILE.` substring is the only marker
  this gate watches.
- Auto-adding or auto-removing the marker. The script reports; the
  operator (or AI agent) edits.

## Output contract

- stdout (success): `verify-setup-headers: OK (<N> required setup file(s) checked)`
- stderr (failure): one summary line plus one issue per line:
  - `  MISSING SETUP header: <relative-path> (matched: <reason>)`
  - `  UNEXPECTED SETUP header: <relative-path> (...)`
- stderr (src/ missing): `verify-setup-headers: missing <relative-path>`
- Exit code: 0 on success, 1 on any issue (including a missing src/).
