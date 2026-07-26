# loadElk

## Purpose

Dependency-injectable loader that turns a missing `elkjs` install into a clear, actionable error.

## Paths

See the `paths:` field in the machine spec fenced block below for the full happy / edge-case enumeration.

The dependency-injectable loader that turns a missing `elkjs` install into a clear, actionable error
instead of a bare "module not found". The `importer` parameter exists purely for testability — it lets
tests inject a stub or failing loader without needing the real `elkjs` package installed.

```yaml
flow: loadElk
kind: helper
source: src/layout/elkEngine.ts
symbol: loadElk
inputs:
  importer: "() => Promise<iElkModule> (optional) — defaults to `() => import('elkjs/lib/elk.bundled.js')`; tests inject a stub/failing loader here"
returns:
  - "Promise<iElkInstance> — `new mod.default()`, an instantiated ELK engine ready for `.layout()`"
throws:
  - "Error — 'The elk layout engine requires the optional peer dependency \"elkjs\". Install it with `pnpm add elkjs`. (<reason>)' — thrown whenever `importer()` rejects, for any rejection reason (Error or non-Error)"
calls:
  - "importer() — the injected or default dynamic import"
  - "new ElkCtor() — mod.default's constructor"
called_by:
  - "elkEngine.run() — called with no importer override (always the real dynamic import)"
  - "test code — calls loadElk() directly with a custom importer to exercise both the success and failure paths without installing/removing the real elkjs package"
emits_events: []
side_effects_on_success:
  - "none"
side_effects_on_failure: "none"
transaction: "none"
test: src/layout/elkEngine.test.ts
spec: src/layout/__specs__/spec.md
ai_agent_action:
  when_to_call: "when code needs an elkjs instance and wants a clear, actionable error if the optional peer dependency isn't installed, rather than a bare module-resolution failure"
  when_not_to_call: "when the dagre engine is sufficient — loadElk()/elkjs is only needed for the opt-in ELK engine"
  natural_language_examples:
    - "load the elk layout engine"
  agent_invocation: "internal — not independently callable over HTTP/UI/CLI; imported and awaited directly: `await loadElk()`"
  confirm_with_user_before: "none — read-only, but may require installing elkjs as a prerequisite"
  summarize_to_user_after: "\"elkjs loaded.\""
  summarize_to_user_after_failure: "\"elkjs is not installed. Run `pnpm add elkjs`.\""
paths:
  happy:
    - "called with no argument (default importer) -> the real dynamic import of elkjs/lib/elk.bundled.js resolves -> returns `new mod.default()`, a working ELK instance whose .layout is a function"
    - "called with a custom importer resolving a fake module (e.g. `{ default: FakeElk }`) -> returns `new FakeElk()`, proving the DI seam works end-to-end without the real package"
  error_importer_rejects_with_error:
    - "importer() rejects with an Error (e.g. `new Error('module not found')`, simulating elkjs not installed) -> `cause instanceof Error` is true -> reason = cause.message -> throws a new Error whose message embeds that reason and matches /optional peer dependency \"elkjs\"/"
  error_importer_rejects_with_non_error:
    - "importer() rejects with a non-Error value (e.g. the string 'boom') -> `cause instanceof Error` is false -> reason = String(cause) -> throws the same wrapped Error shape/message pattern, proving the wrapping is robust to non-Error rejections too"
mermaid: |
  flowchart TD
    A[loadElk(importer = defaultDynamicImport)] --> B{await importer()}
    B -->|resolves mod| C[return new mod.default()]
    B -->|rejects, cause instanceof Error| D[error_importer_rejects_with_error:<br/>reason = cause.message]
    B -->|rejects, non-Error cause| E[error_importer_rejects_with_non_error:<br/>reason = String(cause)]
    D --> F[throw new Error - optional peer dependency elkjs... reason]
    E --> F
```
