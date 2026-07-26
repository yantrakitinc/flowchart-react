# MOCKING_DOCTRINE

> Rationale for every rule: MOCKING_DOCTRINE.rationale.md. Tool choices (MSW, pglite, Vitest): TEST_STACK.md. Coverage bar the refactor protects: UNIT_COVERAGE#coverage. ---------- mocks: DI for code-i-own, MSW for code-i-don't ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## mocking_doctrine

- `code_i_own`:
  - `pattern`: inject dependencies as interfaces (fetchImpl, clock, rng, hasher)
  - `test`: pass vi.fn() or fake adapter at construction
  - `rule`: PREFERRED over MSW for code I author
- `code_i_don_t_own`:
  - `pattern`: MSW handlers
  - `test`: server.use(http.<method>(path, handler)) per scenario
  - `rule`: PREFERRED when the call goes through globalThis.fetch via a library I can't refactor
- `banned`:
  - vi.mock("module") for module-level mocking (last-resort signal)
  - LOCAL_DEV_FORCE_ALL_MOCKS_ON-style runtime toggle infrastructure (UI-app concept; not part of API-first standard)

## refactor_to_testability

- `rule`: untestable function = hidden coupling; refactor by injecting the dependency as an interface
- `hidden_dependencies_to_inject`:
  - Date.now() / new Date() → inject clock
  - fetch() → inject fetcher
  - Math.random() → inject rng
  - process.env.X → inject env reader (or pass the value)
  - fs.readFileSync() → inject fs port
- `banned`:
  - lowering the coverage threshold
  - '"/* istanbul ignore */" annotations'
  - adding files to coverage exclusion lists

Last updated: 2026-07-12T00:00:00Z