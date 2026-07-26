# scripts/verify-manual-playbooks — manual-playbook verifier

## Concept

The script asserts every user-facing route / page folder has a sibling
manual playbook for every flow doc, AND that each existing markdown
playbook contains the four mandatory section headers.

A "user-facing surface folder" is any folder under `src/app/` that
DIRECTLY contains a `route.ts` OR a `page.tsx` file.

Three playbook shapes are accepted (in priority order):

1. **YAML** — `__specs__/manual/<basename>.yaml`. Schema-validated by
   SPEC_CONTRACT; no H2 header check here.
2. **Markdown single-file** — `__manual__/<basename>.md`. H2 header
   check applies.
3. **Markdown split-audience** — both
   `__manual__/<basename>.extension.md` AND `__manual__/<basename>.manual.md`.
   H2 header check applies to both files.

The four required H2 headers (literal substring match, leading
whitespace allowed):

- `## Setup (operator-side, terminal)`
- `## Execution (Chrome extension or browser-only)`
- `## Expected response shape`
- `## Pass criteria`

Folders WITHOUT a `__specs__/flows/` directory are skipped — the
missing-flows case is caught by `verify-flow-coverage` /
`verify-docs`.

## Files

1. `verify-manual-playbooks.mjs` — entry point. Exports the constants
   (`REQUIRED_HEADERS`), the pure helpers (`isUserFacingSurfaceFolder`,
   `listFlowBasenames`, `checkPlaybook`, `checkHeaders`), the audit /
   formatting / driver layer (`audit`, `formatReport`, `main`,
   `cliMain`, `isCliInvocation`, `maybeRunCli`), and the default IO
   ports.
2. `__tests__/verify-manual-playbooks.test.mjs` — Vitest suite. Drives
   every helper via dependency-injected IO so the suite reaches
   100/100/100/100 per-file coverage without spawning a process.
3. `__specs__/spec.yaml`, `__specs__/spec.md`,
   `__specs__/flows/*.flow.yaml`,
   `__specs__/manual/verify-manual-playbooks.yaml`,
   `__specs__/standards-compliance.yaml`.

## Out of scope

- Validating the CONTENT of a `.yaml` manual playbook. SPEC_CONTRACT
  schema-validates the YAML; this script only asserts the file exists.
- Generating the playbook from a flow doc. The script reports; the
  operator (or AI agent) writes the playbook.
- Walking anything outside `src/app/`. Scripts / e2e / library code
  have no user-facing surface; this script never inspects them.

## Output contract

- stdout (success): `verify-manual-playbooks: OK (<N> user-facing folder(s) checked, <M> playbook(s) with all 4 sections present)`
- stderr (failure): one summary line plus one issue per line:
  - `  MISSING <expected-path> for <route-folder>`
  - `  MISSING_HEADER "<header>" in <playbook-path>`
- Exit code: 0 on success, 1 on any issue.
