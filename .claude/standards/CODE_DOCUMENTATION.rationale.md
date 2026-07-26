# CODE_DOCUMENTATION — detail

Why each rule in `CODE_DOCUMENTATION.md` exists. Read this when changing a rule, or when a rule feels arbitrary and you need the load-bearing reason.

## JSDoc — light + required, with detail in specs

Every exported function/class/type/interface gets a JSDoc block with `@description`. The block is 1-3 lines — pointing at what the symbol does. The DETAIL of what it does, every parameter, every error case, every edge — lives in the spec.md + flow.md.

Why split: JSDoc bloat tempts authors to maintain two copies of the truth (JSDoc + spec). They drift. The 1-3-line rule + spec-pointer pattern says JSDoc is the locator; the spec is the truth. One source of truth, no drift.

`@example` is allowed when an example is genuinely clarifying. Most exports don't need one; specs do.

## Inline comments — zero by default, WHY-only

Commented-out code is banned because git already tracks history; dead code in the file is noise that readers must mentally diff against the live code. Inline comments explaining WHAT are banned because a well-named identifier carries that information without a second copy that can drift. History / changelog narration in JSDoc or comments is banned for the same one-source-of-truth reason — UI history belongs in the Changelog story, everything else in git.

The only inline comment that earns its place is a WHY the code cannot express: a hidden constraint, a subtle invariant, a workaround for a specific bug, a non-obvious ordering requirement. The `spec_reference_format` line gives the one sanctioned pointer shape from code to its spec, so readers land on the truth instead of a paraphrase.

Last updated: 2026-07-12T00:00:00Z
