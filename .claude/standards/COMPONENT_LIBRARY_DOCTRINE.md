# COMPONENT_LIBRARY_DOCTRINE

> ---------- component library doctrine ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## component_library

- `api_shape`: MUI prop names + types + behavior
- `internal_styling`: Tailwind + DaisyUI semantic tokens
- `primitives`:
  - `first_choice`: shadcn
  - `custom`: build only when shadcn truly doesn't cover
- `library_location`:
  - `single_app_project`: in-tree at src/components/ui/
  - `monorepo_multi_consumer`:
    a shared workspace package (e.g., packages/ui) when 2+ apps in the repo consume the same
    design system. The package mirrors the standard internal layout
    (packages/ui/src/components/ui/ + src/components/shadcn/) so every UI gate applies
    unchanged when run with the package as its root. Storybook lives with the package.
- `shared_design_system_rule`:
  - `rule`: a design system consumed by 2+ apps in one monorepo lives in ONE shared workspace package — never hand-duplicated across apps. A single-app project keeps it in-tree at src/components/ui/.
  - `portability_preserved`: the package ships components that consume CSS vars ONLY — no bundled token values; each consuming app supplies tokens via its own globals.css (the same theme-agnostic contract the in-tree portability rule enforces, so a workspace package satisfies it identically)
  - `verify_wiring`: the UI-components gate runs against the package root (packages/ui) as a workspace target
- `cross_repo_published_exception`: a project MAY also publish a focused npm package (e.g., a cross-project icon catalog) for cross-REPO reuse with its own publish cycle; document in that project's memory, not here

## portability

- `rule`:
  The design system (in-tree src/components/ui/ OR a shared packages/ui) MUST be portable —
  copy-pasteable / installable into another project with zero edits, consuming CSS vars only
  with zero project-specific imports
- `banned_imports_from_ui`:
  - project-specific paths (@/lib/<project>, @/features/<feature>)
  - any module that depends on the host project's specific state
- `theme`: applied via destination project's globals.css; UI components consume CSS vars only

## variants

- `tools`:
  - cva (class-variance-authority)
  - tailwind-variants
- `rule`: build variants incrementally; only what's currently needed; extend as required
- `banned`: implementing all possible variants up front (anticipation)
- `state_class_bindings`: within a variant group, state-class consistency is owned by STATE_VOCABULARY#cross-variant-consistency

## tailwind_tokens

- `rule`: components use ONLY semantic tokens from project's globals.css
- `examples_allowed`: [text-foreground, text-muted, bg-surface, bg-destructive, text-white/60]
- `banned`: hardcoded color-shade classes (text-red-500, bg-gray-100, etc.)
- `see`: DESIGN_TOKENS.md _(single owner of the full token discipline (allowed/banned class shapes, CSS-var syntax, verifier))_

Last updated: 2026-07-12T00:00:00Z