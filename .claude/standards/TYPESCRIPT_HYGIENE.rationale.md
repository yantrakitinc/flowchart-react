# TYPESCRIPT_HYGIENE — detail

Why each rule in `TYPESCRIPT_HYGIENE.md` exists. Read this when changing a rule, or when a rule feels arbitrary and you need the load-bearing reason.

## Strict + no any + no @ts-ignore

`strict: true` plus strict null checks turns the compiler into the first defense layer. Bad refactors don't compile. Missing-null bugs don't compile. Wrong-shape arguments don't compile.

`any` is banned because it's the escape hatch that defeats every other type-check. `unknown` is the safe alternative — the compiler refuses to USE the value until it's narrowed. The narrowing step is where the runtime check lives.

`@ts-ignore` and `@ts-expect-error` are banned in production code because they pretend a type error doesn't exist. The lone exception is `@ts-expect-error` in `__tests__/` — there the assertion that "this expression IS supposed to fail to compile" is itself the test.

Zero ESLint warnings (not just zero errors) closes the "warnings as informational" loophole. A warning that isn't acted on becomes wallpaper; eventually nobody notices when a real one shows up.

## Type co-location & export hygiene

Types live next to the runtime code that uses them. Pulling all interfaces into a separate `<name>.types.ts` makes the relationship between a type and the code it constrains invisible — readers have to jump between files to verify shape.

The rule: only `export` a type if another file imports it. An unused export is dead public API surface — confusing for readers ("who consumes this?"), expensive for refactors ("can I rename it?"), wrong for testability ("we shipped a type contract nobody uses").

Three exceptions are real:
- **Shared cross-feature contracts** — `src/lib/api/result.ts`, `<feature>/types/domain.ts`. Many consumers across many files justify the dedicated location.
- **ORM-schema-inferred types** — `type iUser = typeof users.$inferSelect` stays as an expression on the schema export; consumers write the inference inline rather than importing.
- **Generated types** (CMS, codegen) — machine-managed; live in dedicated dirs.

Last updated: 2026-07-12T00:00:00Z
