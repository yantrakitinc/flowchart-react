# COMPOSITE_CREATION

> scope

```meta
version: 2
last_updated: 2026-07-11T00:00:00Z
```

## scope

- `applies_to`:
  composite UI components — composed of 2+ atomic primitives — living in
  src/features/<feature>/components/<Composite>/ (per-feature, not portable) OR
  src/components/composites/<Composite>/ (shared, used by 2+ features).
  Example: ConfirmDialog.
- `discovery`:
  path-agnostic via the verify-composite-* scripts (shared helper — see
  COMPONENT_CREATION#scope): EITHER by location (components/composites
  or a feature-located <feature>/components folder) OR by an explicit `tier: composite`
  marker in spec.md (so a composite may live anywhere). The marker is the true gate — an
  atomic in a feature-located components/ folder is never mistaken for a composite.
- `relationship_to_existing`:
  - `COMPONENT_CREATION.md`:
    tier-1; governs atomic primitives. A composite consumes atomics; it does NOT re-state
    atomic concerns (anatomy / state matrix / tokens / a11y of the atomic itself — those
    live in the atomic's own spec.md + design.md).
  - `STORYBOOK_SETUP.md`: Storybook (applies to composites)
  - `COMPONENT_FOLDERS.md`: folder shape (same component_folder schema)
  - `COMPONENT_LIBRARY_DOCTRINE.md`: library doctrine (applies to composites)
  - `PAGE_CREATION.md`:
    tier-3; pages compose composites. A composite consumed by a page is treated identically
    to how a composite treats an atomic — by reference, no re-statement.

## thin_spec_doctrine

- `rule`:
  composite specs carry ONLY what is new at the composition level. Atomic concerns (variant
  matrix, token bindings, state vocabulary, a11y of the atomic itself) live in the atomic's
  own spec and are TRUSTED by the composite.
- `what_composite_specs_carry`: _(shapes + rules in composite_spec_schema below)_
  - consumed_atomics + the props frozen for each
  - state_propagation (composite-level state — open/closed, loading, etc. — cascading to children)
  - focus_order_across_atomics
  - composition_anatomy
  - composition_aria (how the composition pattern, e.g. modal dialog APG, combines child patterns)
  - composition_edge_cases (e.g. primary action loading; cancel still works)
- `what_composite_specs_DO_NOT_carry`:
  - the atomic's own state matrix
  - the atomic's own token bindings
  - the atomic's own variant × color matrix
  - duplicate ARIA pattern documentation (cite atomic's spec by URL instead)
  - duplicate test cases for atomic behavior (test the composition, not the atomic)

## phases

- `order`: research → design → test → implement → stories → verify
- `enforcement`: each phase's exit gate must pass before the next begins
- `details`: 0_research:
    - `writes`:
      - __specs__/research.md _(competitor scan focused on the composition pattern (modal-dialog patterns, list-editor patterns, etc.))_
    - `depth`: per COMPONENT_CREATION#coverage-x-stakes-matrix
    - `domain_survey`: mandatory at composite tier (per COMPONENT_CREATION#domain-survey-trigger-matrix)
    - `gate`: research.md exists, non-empty, baseline decision named
    - `verifier`: verify-component-research-cited.mjs (reused across tiers) 1_design:
    - `writes`:
      - __specs__/spec.md _(composite_spec_schema below)_
      - __specs__/spec.md _(Concept / Files / Out of scope / Open decisions)_
      - __specs__/design.md _(composition_anatomy + state_propagation + focus_order + cross-atomic edge cases)_
      - __specs__/flows/<interaction>.flow.md
      - __specs__/manual/<flow>.md
      - __specs__/standards-compliance.md
    - `gate`:
      design.md carries an accepted lock marker; consumed_atomics in spec.md all resolve to
      existing atomic folders AND those atomics are status:locked AND each frozen_prop is
      valid against the atomic's spec.md.public_api.props schema
    - `verifier`: verify-component-design-locked + verify-composite-composition + (when by:agent) verify-component-design-self-lock-eligible 2_test:
    - `writes`: __tests__/<Composite>.test.tsx
    - `rule`:
      tests cover composition behavior — state_propagation, focus_order, cross-atomic edge
      cases. Atomic behavior is NOT re-tested (those tests live in the atomic's folder).
    - `gate`: per-file 100/100/100/100 thresholds configured 3_implement:
    - `writes`:
      - <Composite>.tsx
      - types.ts
      - index.ts
      - subcomponents as needed (each .tsx + .test + .stories per COMPONENT_FOLDERS.md)
    - `gate`: tests green; per-file 100/100/100/100; typecheck + lint green
    - `forbidden_during_this_phase`:
      - inlining atomic behavior instead of importing from the atomic's barrel
      - re-implementing a state class the shared states.css already provides
      - bypassing the atomic's public API (reaching into the atomic's internal types) 4_stories:
    - `writes`: __stories__/<Composite>.stories.tsx
    - `required_stories`: Usage / Playground / AllVariants per STORY_FORMAT#story-file
    - `gate`: stories render; addon-a11y zero violations 5_verify:
    - `runs`:
      - verify-component-research-cited
      - verify-component-design-locked
      - verify-component-design-self-lock-eligible (when by:agent)
      - verify-composite-composition
      - verify-composite-state-propagation
      - verify-component-tokens (still applies — composite source uses CSS vars)
      - verify-component-state-vocab (still applies — composite source binds to state classes only)
      - verify-no-history-baked-in
      - per-file 100/100/100/100 coverage
      - addon-a11y zero violations
    - `gate`: all green → flip standards-compliance.md to status:locked + verified:100% + last_validated:<today>

## artifacts_required

- `source`:
  - <Composite>.tsx
  - types.ts
  - index.ts
- `tests`:
  - __tests__/<Composite>.test.tsx
- `stories`:
  - __stories__/<Composite>.stories.tsx
- `specs`:
  - __specs__/research.md
  - __specs__/spec.md
  - __specs__/spec.md
  - __specs__/design.md
  - __specs__/flows/<interaction>.flow.md
  - __specs__/manual/<flow>.md
  - __specs__/standards-compliance.md

## composite_spec_schema

- `required_top_level_fields`:
  - `spec_version`: int
  - `component`: string
  - `tier`: composite
  - `package`: string
  - `folder`: path
  - `status`: enum[draft, locked]
  - `api_shape`: enum[MUI, DaisyUI, shadcn, custom-justified]
  - `stakes`: enum[internal, standard, brand]
- `required_blocks`:
  - `public_api`:
    - `required_subfields`: [exports, props]
  - `consumed_atomics`:
    - `type`: list<{path, package, locked_sha, locked_at}>
    - `rule`:
      every entry resolves to an atomic folder containing __specs__/standards-compliance.md
      with status:locked. locked_sha = git SHA (or short SHA) of the commit that flipped the
      atomic to status:locked; locked_at = ISO date of that commit. verify-composite-composition
      refuses entries with missing locked_sha. verify-cross-tier-freshness refuses entries
      where the atomic's CURRENT source has commits later than locked_sha touching the
      atomic's folder (stale lock) — either re-lock the composite against the current atomic
      OR revert the atomic to the pinned SHA.
    - `verifier`: verify-composite-composition + verify-cross-tier-freshness
  - `frozen_props`:
    - `type`: matrix<atomic_path × prop_name → frozen_value>
    - `rule`: every frozen value is a literal AND matches the type declared in the atomic's spec.md.public_api.props[prop_name].type
    - `example`: ConfirmDialog primary action: { atomic: "Button", variant: "contained", color: "primary" }
  - `state_propagation`:
    - `type`: list<{composite_state, atomic_target, prop_set_on_atomic, condition}>
    - `rule`: every composite-level state that should affect a child atomic is declared here
    - `example`: "composite_state: loading → atomic_target: primary_button → prop: loading → condition: always"
    - `verifier`: verify-composite-state-propagation checks declaration AND implementation
  - `focus_order_across_atomics`:
    - `type`: ordered_list<{atomic_path, role_in_composition, focus_event}>
    - `rule`: declare tab order across atomics + what gets focus on composite mount + on unmount (focus-return)
  - `composition_anatomy`:
    - `type`: hierarchical_list<{atomic_path, role, optional_subcomposition}>
    - `rule`: hierarchical sketch — atomic inside atomic inside …
  - `composition_aria_pattern`:
    - `type`: object
    - `required_subfields`: [pattern_url, what_we_use, what_we_skip]
    - `rule`: WAI-ARIA APG URL for the COMPOSITION pattern (e.g. modal dialog); child-atomic ARIA patterns are NOT restated
  - `composition_edge_cases`:
    - `type`: list<{case, handling}>
    - `rule`: only interactions BETWEEN atomics; atomic-internal edge cases are NOT restated
- `optional_blocks`:
  - `responsive_behavior`: usually n/a for dialogs and inline panels; required for layout composites
  - `forced_colors_handling`: usually inherited from atomics; required if composite adds chrome
  - `reduced_motion_handling`: required if composite adds transitions
  - `rtl_handling`: required if composition direction is asymmetric
- `forbidden_blocks_AT_COMPOSITE_TIER`:
  - the atomic's own state matrix
  - the atomic's own token bindings (composites consume atomic exports; don't read atomic's tokens directly)
  - the atomic's own variant matrix
  - duplicate keyboard_map for atomic-internal keys (e.g. Button's Enter/Space)

## design_completeness_blocks

- `required_sections`:
  - composition_anatomy_diagram _(hierarchical sketch showing which atomic contains which)_
  - state_propagation_table _(exhaustive: composite-state × atomic-target × prop-set × condition)_
  - focus_orchestration _(tab order across atomics + initial-focus + focus-return on unmount)_
  - composition_aria_pattern_reference _(WAI-ARIA APG URL for the composition pattern)_
  - composition_edge_cases _(interactions BETWEEN atomics)_
  - composition_open_decisions
- `lock_marker`: "same as atomic — '<!-- design-locked: YYYY-MM-DD by:user|by:agent -->'"
- `verifier`:
  verify-component-design-locked + verify-composite-composition +
  verify-composite-state-propagation + (when by:agent) verify-component-design-self-lock-eligible

## verifiers

- `verify-composite-composition.mjs`:
  - `location`: ~/.claude/standards/scripts/verify/verify-component.mjs --check composite-composition
  - `blocks_when`:
    - any entry in spec.md.consumed_atomics does NOT resolve to an existing atomic folder
    - any consumed atomic's __specs__/standards-compliance.md is not at status:locked
    - any frozen_prop is not a literal value
    - any frozen_prop type doesn't match the atomic's spec.md.public_api.props[prop].type
    - "composite source imports from an atomic's internal files (must use barrel: index.ts)"
  - `exit_code`: 0 on green, 1 on red
- `verify-composite-state-propagation.mjs`:
  - `location`: ~/.claude/standards/scripts/verify/verify-component.mjs --check composite-state-propagation
  - `blocks_when`:
    - >- spec.md.state_propagation declares a rule with no corresponding implementation in source (grep-based: look for the prop_set_on_atomic name in the composite's source under the atomic_target's render context)
    - composite source propagates state to an atomic that is NOT in consumed_atomics
  - `exit_code`: 0 on green, 1 on red

## location_rules

- `default`: src/features/<feature>/components/<Composite>/
- `promote_to_shared`:
  - `when`: 2+ features consume the same composite identically
  - `where`: src/components/composites/<Composite>/
  - `note`: shared composites follow the same standards; the move is a chore PR + import refactor

## anti_patterns

- re-implementing an atomic inside a composite ("I'll just copy Button's render logic")
- restating the atomic's state matrix in the composite's design.md
- bypassing an atomic's public API (importing from its internal files)
- inventing a new state class instead of using the shared states.css vocabulary
- shipping a composite that consumes a draft atomic (the lock workflow must complete bottom-up)
- '"this composite needs a slightly different Button" → file an issue against Button instead of forking'

Last updated: 2026-07-11T00:00:00Z