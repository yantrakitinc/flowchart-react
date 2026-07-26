# PAGE_CREATION

> scope

```meta
version: 2
last_updated: 2026-07-11T00:00:00Z
```

## scope

- `applies_to`:
  pages and surfaces — the top tier of the UI hierarchy. A "page" is any user-facing surface
  that composes composites + atomics into a coherent destination, regardless of whether it's
  a true Next.js route; surface_type distinguishes.
- `surface_types`:
  - `route`: Next.js / React-Router route at src/app/<route>/page.tsx or src/pages/<route>.tsx (e.g. src/app/labs/page.tsx)
  - `sidepanel`: Chrome extension sidepanel view at packages/extension/src/sidepanel/<name>/ (e.g. V3 sidepanel landing)
  - `popup`: Chrome extension popup at packages/extension/src/popup/<name>/ (e.g. toolbar popup)
  - `options`: Chrome extension options page at packages/extension/src/options/<name>/
  - `embedded`:
    surface rendered inside another surface (e.g. a settings drawer) but with its own state
    machine + landmark structure
- `discovery`:
  path-agnostic via the verify-page-* + verify-cross-tier-* scripts through an explicit
  `tier: page` marker in spec.yaml — NOT a hardcoded route path. Any spec-bearing folder
  whose spec declares `tier: page` is a page surface regardless of location. See
  COMPONENT_CREATION#scope.
- `relationship_to_existing`:
  - `COMPONENT_CREATION.md`: tier-1 atomics; pages consume atomics indirectly via composites
  - `COMPOSITE_CREATION.md`: tier-2 composites; pages consume composites by reference (no re-statement)
  - `SITE_BLUEPRINT.md`:
    page-tier slices are gated on a locked site blueprint; every page spec.yaml carries
    blueprint_doc: <docs/site/pages/<slug>.md>. Atomic/composite tiers are exempt.
    Enforced by verify-site-blueprint.mjs.
  - `SPEC_CONTRACT.md`:
    governs the /__specs__/ folder for FEATURES (the feature a page belongs to); page-tier
    specs reference the feature spec's existence but add page-specific concerns.

## thin_spec_doctrine

- `rule`:
  page specs carry ONLY what is new at the surface level. Composite and atomic concerns are
  TRUSTED via their locked specs. The page declares orchestration, structure, and
  surface-specific contracts.
- `what_page_specs_carry`: _(shapes + rules in page_spec_schema below)_
  - surface_type
  - "blueprint_doc: path — docs/site/pages/<slug>.md binding, per SITE_BLUEPRINT#gate"
  - consumed_composites + consumed_atomics
  - layout_grid + responsive_matrix
  - "landmark_structure: <header> / <nav> / <main> / <aside> / <footer> + skip-link target"
  - state_machine (+ URL state, for routes)
  - "focus_orchestration_on_transitions: on-route-enter / on-modal-open / on-async-loaded"
  - performance_budget (routes)
  - seo_contract (routes)
  - error_loading_notfound_surfaces (separate Next.js files error.tsx / loading.tsx / not-found.tsx per route)
  - "analytics_events: page-view, section-view, key interactions"
  - i18n_keys + RTL-at-page-level
- `what_page_specs_DO_NOT_carry`:
  - composite state propagation rules (already in composite spec)
  - atomic anatomy or state matrix
  - duplicate ARIA pattern docs for child composites/atomics

## phases

- `order`: research → design → test → implement → stories → verify
- `enforcement`: each phase's exit gate must pass before the next begins
- `details`: 0_research:
    - `writes`:
      - __specs__/research.md
    - `depth`: per COMPONENT_CREATION#coverage-x-stakes-matrix
    - `domain_survey`: ALWAYS mandatory at page tier — pages have UX patterns library docs don't cover
    - `gate`: research.md exists, non-empty, baseline decision named, industry-leader patterns surveyed
    - `verifier`: verify-component-research-cited.mjs (reused across tiers) 1_design:
    - `writes`:
      - __specs__/spec.yaml _(page_spec_schema below)_
      - __specs__/spec.md
      - __specs__/design.md _(surface_type + layout_grid + landmark_structure + state_machine + focus_orchestration + responsive_matrix + edge_cases + composition_rules)_
      - __specs__/flows/<route-flow>.flow.yaml
      - __specs__/manual/<flow>.md _(Storybook-or-route URL start (route URL allowed at page tier))_
      - __specs__/standards-compliance.yaml
      - __specs__/wireframes/<breakpoint>.md _(one per declared breakpoint; ASCII or unicode-box)_
    - `gate`:
      design.md carries an accepted lock marker; every consumed composite + atomic is
      status:locked; landmark structure declared; state machine named-states + transitions
      enumerated; wireframe per breakpoint
    - `verifier`: verify-component-design-locked + verify-page-landmarks + verify-page-state-machine + (when by:agent) verify-component-design-self-lock-eligible 2_test:
    - `writes`:
      - __tests__/<Page>.test.tsx (or *.spec.tsx; Playwright when route is e2e-tested)
    - `rule`:
      tests cover state-machine transitions + focus orchestration on enter/leave/transition +
      landmark structure + error/loading/not-found surfaces. Composite + atomic behavior is
      NOT re-tested.
    - `gate`:
      tests configured + thresholds met; page-level coverage may be less strict than
      100/100/100/100 — project-policy override allowed in autonomy.yaml 3_implement:
    - `writes`:
      - page.tsx (or route equivalent)
      - layout.tsx (for routes with shared layout)
      - loading.tsx (for routes)
      - error.tsx (for routes)
      - not-found.tsx (for routes)
      - types.ts (for shared types)
    - `gate`: tests green; typecheck + lint green; landmark structure visible in source
    - `forbidden_during_this_phase`:
      - inlining composite or atomic behavior instead of importing
      - "direct hover:/focus: variants (still forbidden at page tier — page source is a component too)"
      - bypassing composite/atomic public API 4_stories:
    - `writes`: __stories__/<Page>.stories.tsx — page-level mock stories at each named state of the state machine
    - `gate`: stories render at every state; addon-a11y zero violations at each state
    - `substitution_rule`:
      for routes that resist easy mocking, the manual flow (manual/<flow>.md) substitutes
      for stories; explicitly declare spec.yaml.stories_substituted_by_manual: true 5_verify:
    - `runs`:
      - verify-component-research-cited
      - verify-component-design-locked
      - verify-component-design-self-lock-eligible (when by:agent)
      - verify-page-landmarks
      - verify-page-state-machine
      - verify-component-tokens (page source uses tokens too)
      - verify-component-state-vocab (page source binds state classes too)
      - verify-no-history-baked-in
      - test coverage gates (per autonomy.yaml override-or-default)
      - addon-a11y zero violations
      - Lighthouse / Web Vitals against performance_budget (for routes)
    - `gate`: all green → flip standards-compliance.yaml to status:locked

## artifacts_required

- `source`:
  - page.tsx (or surface equivalent: sidepanel.tsx, popup.tsx, options.tsx)
  - layout.tsx (when surface has nested layout)
  - loading.tsx (route only)
  - error.tsx (route only)
  - not-found.tsx (route only)
  - types.ts (when shared types exist)
- `tests`:
  - __tests__/<Page>.test.tsx
- `stories`:
  - __stories__/<Page>.stories.tsx (OR manual playbook substitute declared in spec)
- `specs`:
  - __specs__/research.md
  - __specs__/spec.yaml
  - __specs__/spec.md
  - __specs__/design.md
  - __specs__/flows/<flow>.flow.yaml
  - __specs__/manual/<flow>.md
  - __specs__/standards-compliance.yaml
  - __specs__/wireframes/<breakpoint>.md

## page_spec_schema

- `required_top_level_fields`:
  - `spec_version`: int
  - `page`: string
  - `tier`: page
  - `package`: string
  - `folder`: path
  - `status`: enum[draft, locked]
  - `stakes`: enum[internal, standard, brand]
  - `surface_type`: enum[route, sidepanel, popup, options, embedded]
- `required_blocks`:
  - `public_route_or_surface`:
    - `type`: object
    - `required_subfields`: [url_or_surface_id, http_status, audience]
  - `consumed_composites`:
    - `type`: list<{path, package, version_pinned_to}>
    - `rule`: every entry resolves to a composite folder at status:locked
  - `consumed_atomics`:
    - `type`: list<{path, package, version_pinned_to}>
    - `rule`: optional at page tier; pages may consume atomics directly when no composite makes sense
  - `layout_grid`:
    - `type`: list<{breakpoint, columns, gutters, row_layout}>
    - `rule`: one entry per declared breakpoint in responsive_matrix
  - `responsive_matrix`:
    - `type`: list<{breakpoint, what_changes}>
  - `landmark_structure`:
    - `type`: list<{landmark_role, element_tag, aria_label_or_labelledby, present_in_surface_types}>
    - `rule`: every page declares its landmarks; verify-page-landmarks confirms source uses them
  - `state_machine`:
    - `type`: object
    - `required_subfields`: [states, transitions, url_state]
    - `rule`: state names + transition table + which states are reflected in URL (search params, hash, path segments)
  - `focus_orchestration_on_transitions`:
    - `type`: list<{from_state, to_state, focus_target}>
  - `seo_contract`:
    - `type`: object
    - `required_subfields`: [title, description, robots, og_image, structured_data, in_sitemap]
    - `rule`: required when surface_type=route; n/a otherwise
  - `analytics_events`:
    - `type`: list<{event_name, fires_when, payload_schema}>
  - `i18n_keys`:
    - `type`: list<{key, default_text, pluralization, rtl_handling}>
  - `performance_budget`:
    - `type`: object
    - `required_subfields`: [lcp_ms, fcp_ms, cls, hydration_budget_kb, total_js_kb]
    - `rule`: required when surface_type=route; sidepanels carry a smaller budget object
  - `error_surface`:
    - `type`: object
    - `required_subfields`: [trigger_conditions, copy, recovery_actions]
  - `loading_surface`:
    - `type`: object
    - `required_subfields`: [trigger_conditions, copy, indicator_type]
  - `not_found_surface`:
    - `type`: object
    - `required_subfields`: [trigger_conditions, copy, recovery_actions]
    - `rule`: required when surface_type=route
  - `forced_colors_handling`: string
  - `reduced_motion_handling`: string
  - `rtl_handling`: string
  - `print_handling`: string
  - `edge_cases`:
    - `type`: list<{case, handling}>
- `forbidden_blocks_AT_PAGE_TIER`:
  - composite state propagation rules
  - atomic anatomy or state matrix
  - duplicate ARIA pattern docs already in child specs

## design_completeness_blocks

- `required_sections`:
  - layout_grid_diagram_per_breakpoint _(ASCII / unicode-box per declared breakpoint)_
  - landmark_structure_map _(which landmarks live where on the page)_
  - state_machine_diagram _(named states + transitions; URL state reflected)_
  - focus_orchestration_on_transitions _(what gets focus when state changes)_
  - responsive_matrix _(what changes per breakpoint)_
  - error_loading_notfound_surfaces _(one section each)_
  - composition_anatomy _(which composites + atomics live where)_
  - composition_aria_pattern _(APG URL for the dominant page pattern (e.g. dashboard, feed, settings))_
  - seo_contract _(for routes; n/a for non-routes)_
  - analytics_events _(what to track)_
  - i18n_strategy _(keys + RTL)_
  - performance_budget _(for routes; smaller for non-routes)_
  - composition_edge_cases
  - composition_open_decisions
- `lock_marker`: "same as atomic/composite — '<!-- design-locked: YYYY-MM-DD by:user|by:agent -->'"
- `verifier`: verify-component-design-locked + verify-page-landmarks + verify-page-state-machine + (when by:agent) verify-component-design-self-lock-eligible

## verifiers

- `verify-page-landmarks.mjs`:
  - `location`: ~/.claude/standards/scripts/verify/verify-page-landmarks.mjs
  - `blocks_when`:
    - spec.yaml.landmark_structure declares a landmark that has no matching element_tag in source
    - source uses a landmark element NOT declared in spec.yaml.landmark_structure (e.g. unexpected <nav>)
    - skip-link declared in spec.yaml but target element does not exist in source
  - `exit_code`: 0 on green, 1 on red
- `verify-page-state-machine.mjs`:
  - `location`: ~/.claude/standards/scripts/verify/verify-page-state-machine.mjs
  - `blocks_when`:
    - >- spec.yaml.state_machine declares a state with no corresponding render branch in source (grep heuristic: the state name as a discriminator in render conditionals)
    - spec.yaml.state_machine declares a transition with no test in __tests__
    - source has a render branch NOT in declared states (unknown state value)
  - `exit_code`: 0 on green, 1 on red

## non_route_surface_adjustments

- `sidepanel`:
  - `page_artifact`: sidepanel-entry.tsx (Vite-served by extension)
  - `layout_artifact`: optional
  - `loading_error_notfound`: replaced by inline state-machine states (loading/error/empty live in state_machine, not separate files)
  - `seo_contract`: n/a
  - `performance_budget`: Chrome-sidepanel-specific (380×640 paint budget + sub-100ms interaction)
  - `landmark_structure`: relaxed — the sidepanel is itself the "main" landmark inside the host page
- `popup`:
  - `page_artifact`: popup-entry.tsx
  - `rule`: like sidepanel but smaller surface; usually no nav landmark
- `options`:
  - `page_artifact`: options-entry.tsx
  - `rule`: closest to route in structure; usually has nav landmark + settings sections
- `embedded`:
  - `page_artifact`: <EmbeddedSurface>.tsx
  - `rule`: when the surface has its own state machine that ISN'T just composite state, treat as page; otherwise it's a composite

## anti_patterns

- putting composite state-propagation rules in the page spec (belongs to composite spec)
- restating atomic state matrix at page tier
- omitting wireframes (every breakpoint needs one)
- shipping a page without a state machine even when only one state exists (declare it as <idle>; not omit)
- skipping error/loading/not-found surfaces for routes
- "direct hover:/focus: in page source (page source is component source; same rule applies)"
- hand-rolling SEO metadata when Next.js Metadata API is the canonical path
- '"this page is too dynamic to spec" — pages without specs become drift hubs; declare states even if there are 12 of them'

Last updated: 2026-07-11T00:00:00Z