# COMPONENT_FOLDERS

> ---------- component folder pattern ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## component_folder

- `shape`:
  ComponentName/
  ├── ComponentName.tsx
  ├── (SubComponent.tsx)               # for compound components (e.g., List + ListItem)
  ├── types.ts
  ├── index.ts                         # MANDATORY barrel
  ├── __tests__/
  │   └── ComponentName.test.tsx
  ├── __stories__/
  │   ├── ComponentName.stories.tsx       # Playground + AllVariants + Changelog (max 3; never more)
  │   ├── ComponentName.readme.mdx        # README doc entry: what the component IS
  │   └── ComponentName.usage.mdx         # Usage doc entry: how to use it; references stories by id
  └── __specs__/                       # AI-facing landing zone
      ├── spec.yaml                    # machine-readable IMPLEMENTATION contract ONLY
      ├── spec.md                      # human prose: concept + exploration + decisions (the narrative)
      ├── flows/<fn>.flow.yaml         # per exported function
      ├── manual/<flow>.md           # browser-executable agent script
      │                                # Start: Storybook story URL (Usage / Playground / specific variant)
      │                                # NOT the app URL
      ├── exception.yaml               # OPTIONAL — opt-in standards waiver (see LOCK_FILES#exception-file)
      └── standards-compliance.yaml    # status + verified + last_validated + feature (4 fields, nothing more)
- `rules`:
  - index.ts is mandatory (the barrel)
  - "import from folder name: `import { List, ListItem } from '@/components/ui/List'`"
  - never import from individual files
  - compound components share one folder; each sub-component gets its own .tsx + .test.tsx + .stories.tsx
  - compound sub-components get their own __specs__/manual/<flow>.md files when their flows differ
- `see`: SPEC_CONTRACT.md (spec layout) + LOCK_FILES.md (compliance file) + STORY_FORMAT.md (story contents) + COMPONENT_DOCS.md (mdx contents)

## component_locations

- `src/components/shadcn/`:
  - `contents`: shadcn auto-generated primitives
  - `edit_rule`: NEVER manually edit; regenerate via shadcn CLI
- `src/components/ui/`:
  - `contents`: design-system components (MUI-shaped, Tailwind/DaisyUI-styled)
  - `portable`: true src/features/<name>/components/:
  - `contents`: feature-specific components
  - `portable`: false (may import feature-internal modules)
- `monorepo_shared_package`:
  - `contents`: in a monorepo with 2+ consuming apps, the shadcn/ + ui/ layers live in the shared workspace package (packages/ui/src/components/{shadcn,ui}/); features/<name>/components/ stays per-app
- `story_rule_applies_to_all`: true _(coverage rule owned by STORY_FORMAT#story-coverage)_
- `library_placement_doctrine`: COMPONENT_LIBRARY_DOCTRINE#component-library

## spec_vs_source_drift_gate

- `rule`:
  Every primitive's spec.yaml MUST declare exactly the `state-*` classes and `var(--*)` tokens
  its source actually uses. Drift in either direction is forbidden:
    - source uses a class/token not in spec → spec is stale, must update
    - spec lists a class/token not in source → spec is over-claimed, must trim
- `enforced_by`: ~/.claude/standards/scripts/verify/verify-component-spec-vs-source.mjs
- `scope`:
  For each component folder under <srcRoot>/components/ui/<Name>:
    - all .ts/.tsx files in <Name>/ (excluding __stories__/__tests__/__specs__)
    - plus the matching shadcn baseline at <srcRoot>/components/shadcn/<name>.tsx OR
      <srcRoot>/components/shadcn/<dashed-name>.tsx (the UI re-export inherits its
      classes/tokens from there)
  Stories and tests are demo/test surfaces, NOT the primitive's API; they don't constrain the spec.
- `sentinel`:
  `state_classes_consumed: ["n/a — <reason>"]` is honored when the source legitimately consumes
  ZERO state-* classes (Tooltip, Progress, Alert, etc.). Tokens have NO sentinel — strict.
- `pre_commit_position`:
  Wired into pre-commit between `verify-component-spec-matrix-completeness` and
  `verify-component-stakes-honest`. Also chained into `pnpm verify:ui`.

Last updated: 2026-07-12T00:00:00Z