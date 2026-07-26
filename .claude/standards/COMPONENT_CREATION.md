# COMPONENT_CREATION

> scope

```meta
version: 2
last_updated: 2026-07-11T00:00:00Z
```

## scope

- `applies_to`:
  design-system UI primitives (Button, Select, Input, Dialog, etc.), path-agnostic
  (discovery_model below) — src/components/ui/<Name>/ (atomic primitives), generic sibling
  src/components/<Name>/, or feature-located <feature>/components/<name>/
  (e.g. packages/extension/src/form/components/icon-button/). Feature-located components
  ARE gated by these verifiers.
- `discovery_model`:
  - `helper`:
    every verify-component-*/composite-*/page-* script discovers targets through the shared
    helper standards/scripts/verify/_discover-components.mjs — never a hardcoded path.
  - `component_folder_rule`:
    a COMPONENT FOLDER is any direct child of a `components/` directory (children of a
    `components/ui/` container are atomic primitives); the `components/` ancestor is required.
  - `per_project_override`:
    `component_roots:` (list of globs) MAY be declared in <repo>/.standards/autonomy.yaml;
    when present those roots REPLACE the default rule — a component is any direct child of a
    listed root.
  - `tier_markers`:
    composite and page discovery additionally require an explicit `tier: composite` /
    `tier: page` marker in spec.yaml. Atomics need no tier marker; a composite under a
    feature's components/ folder is processed only when its spec declares `tier: composite`.
  - `vendoring`:
    projects that vendor standards/scripts/verify/ MUST include _discover-components.mjs
    (the verify-*.mjs scripts import it); re-sync whenever its @version bumps.
- `relationship_to_existing`:
  - `STORYBOOK_SETUP.md`: Storybook setup
  - `COMPONENT_FOLDERS.md`: folder shape
  - `COMPONENT_LIBRARY_DOCTRINE.md`: library doctrine, portability
  - `LOCK_FILES.md`: lock workflow + verified:100% + freshness
  - `SPEC_CONTRACT.md`: __specs__/ folder + spec.yaml shape (features)
  - `COMPONENT_CREATION.md`: design-first process + design completeness + token discipline + state vocabulary for primitives

## phases

- `order`: research → design → test → implement → stories → verify
- `enforcement`: each phase's exit gate must pass before the next begins; pre-commit hook + pnpm verify chain refuse violations
- `details`: 0_research:
    - `writes`:
      - __specs__/research.md _(competitor scan (MUI/DaisyUI/shadcn) + baseline decision + domain survey (when triggered) + recommendation)_
    - `depth`: per coverage_x_stakes_matrix (light | medium | thorough)
    - `domain_survey`: per domain_survey_trigger_matrix
    - `gate`:
      research.md exists, non-empty, names at least one of MUI/DaisyUI/shadcn baselines OR
      justifies "custom" with explicit reasoning. design.md MUST cite research.md.
    - `verifier`: verify-component-research-cited.mjs 1_design:
    - `writes`:
      - __specs__/spec.yaml _(machine schema; component_spec_schema below)_
      - __specs__/spec.md _(human prose: Concept / Files / Out of scope / Open decisions)_
      - __specs__/design.md _(anatomy + state matrix + token bindings + ARIA + keyboard + responsive + edge cases)_
      - __specs__/flows/<interaction>.flow.yaml _(one per user-driven interaction)_
      - __specs__/manual/<flow>.md _(agent script; STARTS from Storybook URL, never app URL)_
      - __specs__/standards-compliance.yaml _(status:draft initially)_
    - `gate`:
      design.md carries an accepted lock marker (autonomy.design_lock_marker_accepted below;
      by:agent requires verify-component-design-self-lock-eligible to pass) AND spec.yaml
      validates against component_spec_schema. Mode governed by the project's
      .standards/autonomy.yaml (autonomy block below).
    - `verifier`: verify-component-design-locked.mjs + verify-component-spec.mjs + verify-component-design-self-lock-eligible.mjs (when by:agent) 2_test:
    - `writes`: __tests__/<Name>.test.tsx
    - `rule`: tests written against the LOCKED spec, before implementation; red-then-green TDD
    - `gate`: tests exist; per-file 100/100/100/100 thresholds configured (passing not yet required) 3_implement:
    - `writes`:
      - <Name>.tsx
      - types.ts
      - index.ts (barrel)
      - subcomponent.tsx (compound only; one .tsx + test + story each)
    - `gate`: tests turn green; per-file 100/100/100/100 coverage; typecheck + lint green
    - `forbidden_during_this_phase`:
      - editing __specs__/spec.yaml without re-locking design.md
      - editing tokens (must reference existing CSS vars only)
      - inventing per-component hover/focus/active treatments (see state_vocabulary) 4_stories:
    - `writes`:
      - __stories__/<Name>.stories.tsx _(EXACTLY: Playground (required) + AllVariants (optional) + Changelog (required); max 3, never more)_
      - __stories__/<Name>.readme.mdx _(README doc entry — WHAT the component IS (distinct from Usage; both required))_
      - __stories__/<Name>.usage.mdx _(Usage doc entry — HOW to use it (distinct from README; both required))_
    - `meta_config_required`:
      - "tags: ['autodocs']" _(mandatory; powers Docs view prop table)_
      - "title: ui/<Name>"
      - "component: <Name>"
    - `stories_shape`:
      Per STORY_FORMAT#story-file — the sidebar lists COMPONENTS, not prop combos:
        - Playground  (required): single args-driven story; every prop via argTypes
        - AllVariants (optional): one labelled grid covering every meaningful surface
        - Changelog   (required): the component's history, newest-first (replaces history-in-JSDoc/comments)
      Per-variant / per-color / per-size / per-state stories are FORBIDDEN.
    - `props_jsdoc_required`:
      types.ts — every public prop on iProps MUST carry PARENT-FACING JSDoc per
      COMPONENT_DOCS#jsdoc + CODE_DOCUMENTATION#docs — one-line description + @default +
      (optional) @example describing how the parent calls it. NO history/rationale in JSDoc
      (history → Changelog story; rationale → spec.md). Storybook autodocs reads this for the
      prop-table Description column.
    - `forbidden_during_this_phase`:
      - any story beyond Playground + AllVariants + Changelog (per-pattern story explosion is banned)
      - inline JSX previews in MDX without a backing story (every MDX preview MUST reference a story by id)
      - duplicating prop table inside MDX manually (autodocs generates it)
      - component history in JSDoc or inline comments (it goes in the Changelog story)
    - `gate`:
      - stories.tsx Meta carries tags:['autodocs']
      - stories.tsx exports a Changelog story
      - readme.mdx exists with all 3 required elements (COMPONENT_DOCS#readme-mdx)
      - usage.mdx exists with the required Meta name + all 8 required sections (COMPONENT_DOCS#usage-mdx)
      - README and Usage are DISTINCT doc entries (Meta name="README" vs name="Usage"); both present
      - types.ts: every iProps public prop has parent-facing JSDoc
      - stories render; @storybook/addon-a11y reports zero violations on EVERY story
      - both docsView surfaces render: ?globals=docsView:docs AND ?globals=docsView:usage
    - `verifier`: verify-component-storybook-docs.mjs 5_verify:
    - `runs`:
      - verify-component-design-locked
      - verify-component-spec
      - verify-component-tokens
      - verify-component-state-vocab
      - verify-component-storybook-docs
      - verify-no-history-baked-in
      - per-file 100/100/100/100 coverage
      - addon-a11y (zero violations)
    - `gate`: all green → flip __specs__/standards-compliance.yaml to status:locked + verified:100% + last_validated:<today>

## artifacts_required

- `source`:
  - <Name>.tsx _(required)_
  - types.ts _(required; separate file)_
  - index.ts _(required; barrel)_
- `tests`:
  - __tests__/<Name>.test.tsx _(required; per-file 100/100/100/100)_
- `stories`:
  - __stories__/<Name>.stories.tsx _(required; Playground + AllVariants + Changelog (max 3; Playground & Changelog required))_
  - __stories__/<Name>.readme.mdx _(required; README doc entry (3 elements: Meta name="README" + # <Name> + **What it is**))_
  - __stories__/<Name>.usage.mdx _(required; Usage doc entry (Meta name="Usage" + 8 sections))_
- `specs`:
  - __specs__/research.md _(required; Phase 0; competitor scan + baseline + domain survey + recommendation)_
  - __specs__/spec.yaml _(required; IMPLEMENTATION-ONLY; validates against component_spec_schema)_
  - __specs__/spec.md _(required; narrative: Concept / Files / Out of scope / Open decisions)_
  - __specs__/design.md _(required; carries the lock marker on approval)_
  - __specs__/flows/<interaction>.flow.yaml _(required; one per interaction; subagent walks these)_
  - __specs__/manual/<flow>.md _(required; Storybook URL start)_
  - __specs__/exception.yaml _(OPTIONAL; opt-in standards waiver (PROCESS_DISCIPLINE))_
  - __specs__/standards-compliance.yaml _(required; 4 fields only (status/verified/last_validated/feature))_

## autonomy

- `design_lock_marker_accepted`:
  - '<!-- design-locked: YYYY-MM-DD by:user -->' _(human review path)_
  - '<!-- design-locked: YYYY-MM-DD by:agent -->' _(autonomous path; requires self-lock eligibility)_
- `mode_source`: <project-root>/.standards/autonomy.yaml
- `mode_values`:
  - `autonomous`: agent inserts by:agent marker after verify-component-design-self-lock-eligible passes
  - `review-locked`: only by:user marker accepted
  - `mixed`: review-locked for paths matching autonomy.yaml.review_locked_overrides; autonomous elsewhere
- `mode_default_when_file_missing`: autonomous
- `audit_trail`:
  every locked design.md carries its by:user|by:agent attribution in the marker itself;
  `git log --all -G 'design-locked'` enumerates the lock history
- `self_lock_eligibility`:
  - `gate`: verify-component-design-self-lock-eligible.mjs
  - `blocks_when_any_true`:
    - any of the 12 design.md required_sections contains a <PLACEHOLDER> string or template residue
    - state matrix uses '…' / 'etc.' / 'tbd' instead of exhaustive entries
    - ARIA pattern reference is neither a real APG URL (https://www.w3.org/WAI/ARIA/apg/patterns/<slug>/) nor explicit 'n/a — <reason>'
    - any edge_cases row missing case OR handling
    - spec.yaml contains 'tbd' / 'TBD' / 'TODO' / 'FIXME' / '<…>' placeholders
    - "any contrast_pairs row with passes:false lacks a non-empty deviation: string"
    - any deferred_variants_explicit_followups entry lacks a reason or trigger
    - design.md does NOT reference research.md
    - cross_variant_consistency_rule statement is missing or doesn't name concrete state classes
- `user_override`:
  - user may insert by:user marker at any time regardless of mode; takes precedence over by:agent
  - user may delete a by:agent marker to force re-lock under review-locked mode

## coverage_x_stakes_matrix

- `rule`: research depth derives from (library coverage axis) × (stakes axis)
- `axes`:
  - `library_coverage`:
    - `full`: direct primitive match in shadcn / MUI / DaisyUI (e.g., Button)
    - `partial`: primitive exists but doesn't cover the specific need
    - `none`: no library primitive applies (novel composition or domain pattern)
    - `classification`: agent self-classifies; if WebSearch finds 5+ strong precedents in <60s, treat as Partial; else None
  - `stakes`:
    - `internal`: dev tool, lab page, not in user-facing flow
    - `standard`: user-facing but not the brand surface
    - `brand`: primary user-facing surface defining the product
    - `classification`: derived from stakes_signal_source below
- `depth_matrix`:
  - `full_internal`: light
  - `full_standard`: light
  - `full_brand`: medium
  - `partial_internal`: medium
  - `partial_standard`: medium
  - `partial_brand`: thorough
  - `none_internal`: medium
  - `none_standard`: thorough
  - `none_brand`: thorough
- `depth_budgets`:
  - `light`: 1 doc fetch per library + baseline-match recommendation; ~2 KB research.md; ≤ 3 web requests total
  - `medium`: multi-page read per library + 3–5 web searches; gap analysis; ~8 KB research.md
  - `thorough`: full competitive matrix + read primary sources (APG, ECMA, WHATWG) + cite 8+ references + named industry leaders; ~20+ KB research.md

## domain_survey_trigger_matrix

- `rules`:
  - when: library_coverage == full AND stakes in [internal, standard]
    - `survey`: skip
  - when: library_coverage == full AND stakes == brand
    - `survey`: light (brand-language conventions only, not full domain scan)
  - when: library_coverage == partial
    - `survey`: targeted (only the gap dimensions; named in research.md)
  - when: library_coverage == none
    - `survey`: mandatory full survey
  - when: tier in [composite, page]
    - `survey`: mandatory regardless of axes (UX patterns that library docs don't cover)
- `survey_sources`:
  - `primary`: WAI-ARIA APG, WHATWG HTML, WCAG 2.x
  - `industry_leaders_by_domain`:
    - `forum_threading`: Discourse, Reddit, Hacker News
    - `chat_composition`: Slack, Discord, Element (Matrix), iMessage
    - `dashboard_widget`: Datadog, Grafana, Mixpanel, Linear, Vercel
    - `e_commerce_product`: Stripe Checkout, Shopify, Amazon (PDP)
    - `data_table`: Linear, Notion, Airtable, MUI X DataGrid
    - `file_explorer`: VS Code, Finder, GitHub web file tree
    - `a11y_extension_sidepanel`: axe DevTools, WAVE, Lighthouse
    - `note`: add domains per project as encountered
- `output_in_research_md`: every cited source becomes a row under research.md.domain_pattern_survey

## stakes_signal_source

- `resolution_order`: 1: explicit autonomy.yaml.brand_surfaces glob match → brand 2: explicit autonomy.yaml.internal_surfaces glob match → internal 3: folder location inference (rules below) → derived 4: default → standard
- `folder_inference_rules`:
  - 'packages/*/src/components/ui/**': standard
  - 'packages/*/src/features/**': standard
  - 'packages/*/src/components/composites/**': standard
  - 'src/app/labs/**': internal
  - 'src/_smoke/**': internal
  - 'src/internal/**': internal
  - 'docs/archive/**': internal
- `override_in_chat`: user may declare stakes per-component in chat; agent records it in the component's spec.yaml.stakes field

## component_spec_schema

- `doctrine`:
  spec.yaml is IMPLEMENTATION-ONLY. verify-component-spec.mjs requires EXACTLY the four
  required_blocks below — the contract a coder builds + a verifier checks against. Do NOT
  restate narrative in spec.yaml (see narrative_lives_elsewhere).
- `required_top_level_fields`:
  - `spec_version`: int
  - `component`: string
  - `package`: string
  - `folder`: path
  - `status`: enum[draft, locked]
  - `api_shape`: enum[MUI, DaisyUI, shadcn, custom-justified] _(must match COMPONENT_LIBRARY_DOCTRINE.md choice)_
- `required_blocks`:
  - `public_api`:
    - `required_subfields`: [exports, props]
    - `props_each_required`: [type, default]
    - `props_optional`: [notes, deferred_until]
  - `tokens_consumed`:
    - `type`: list<css_var_name>
    - `rule`: every CSS var the component reads must be listed; verifier cross-checks against source grep
  - `state_classes_consumed`:
    - `type`: list<state-class-name>
    - `rule`: every shared state-* class the component references must be listed (or a single "n/a — <reason>")
  - `test_coverage`:
    - `type`: object
    - `rule`: declares the per-file coverage target the component meets (statements/branches/functions/lines = 100)
- `optional_blocks_validated_when_present`:
  - `interaction_states`:
    - `type`: matrix<variant × color × size × state>
    - `states_required`: [rest, hover, focus_visible, focus_within, active, pressed, disabled, loading]
    - `cell_value`: reference to a token AND/OR a state class — never an inline value
    - `when_present`: verify-component-spec-matrix-completeness cross-checks rest keys vs declared enums
  - `touch_target_minima`:
    - `type`: object
    - `required_subfields`: [wcag_sc, min_px]
    - `rule`: WCAG 2.5.8 minimum 24×24 CSS px per size variant
  - `wcag_aa_contrast_pairs`:
    - `type`: list<{combo, text_color, bg_color, ratio, rule, passes}>
    - `rule`: "passes:false rows MUST carry a deviation: explanation"
- `narrative_lives_elsewhere`:
  - `design_md`: anatomy, aria_pattern, keyboard_map, reduced_motion, forced_colors, rtl, print, responsive, edge_cases
  - `spec_md`: concept, exploration, decisions + rationale, out of scope
  - `changelog_story`: component history
- `forbidden`:
  - prose rationale in spec.yaml (goes in spec.md)
  - design narrative in spec.yaml — anatomy/aria/keyboard/contrast/edge-cases (goes in design.md)
  - component history in spec.yaml (goes in the Changelog story)
  - migration notes (commit messages)
  - implementation details ("uses shadcn baseline at..." — goes in spec.md or code comments)

## design_completeness_blocks

- `required_sections`:
  - anatomy_diagram _(ASCII or unicode-box sketch naming every part)_
  - state_matrix _(exhaustive variant × color × size × state grid; each cell names tokens + state-classes used)_
  - token_bindings _(explicit table: which CSS var is read by which part in which state)_
  - cross_variant_consistency_rule _(statement of which states share treatment across colors/sizes/variants)_
  - aria_pattern_reference _(WAI-ARIA APG URL or "n/a — <reason>")_
  - keyboard_interactions _(exhaustive list including Tab order)_
  - responsive_strategy _(px breakpoints + what changes)_
  - forced_colors_strategy _(palette mapping)_
  - reduced_motion_strategy _(transitions disabled / preserved)_
  - rtl_strategy _(mirror or symmetric)_
  - edge_cases _(named cases + handling)_
  - composition_rules _(what containers this goes in; what it consumes; what consumes it)_
- `lock_marker`:
  - `pattern`: '<!-- design-locked: YYYY-MM-DD -->'
  - `inserted_by`: user (never the spec-writer or the coder)
  - `location`: anywhere in design.md (verifier searches the full file)
- `verifier`: verify-component-design-locked.mjs enforces marker presence; verify-component-spec.mjs enforces every required_section present and non-empty

## state_vocabulary

- `rule`:
  every interactive state binds to a shared state utility class. Components NEVER write
  direct hover:/focus:/focus-visible:/active:/disabled: Tailwind utilities in their source.
- `shared_class_naming`:
  - `pattern`: state-<state>-<variant_or_inherit>
  - `canonical_classes`:
    - state-hover-contained _(darkens via filter (consistent across primary/error/inherit))_
    - state-hover-outlined _(subtle bg tint)_
    - state-hover-text _(subtle bg tint)_
    - state-focus-visible _(3px outline + offset; same for ALL variants)_
    - state-active-contained _(darker on press)_
    - state-active-outlined
    - state-active-text
    - state-disabled _(opacity 0.5 + pointer-events:none)_
    - state-loading _(disabled treatment + spinner slot)_
    - state-pressed _(aria-pressed=true visual treatment)_
- `source`: project/src/styles/states.css (or equivalent); template ~/.claude/standards/templates/component-states.css.template
- `rule_of_consistency`:
  within a cva config, all entries inside the same `variant` group MUST consume the same
  state-class prefix. Example: variants.variant.{default, secondary, destructive} must all
  pair with `state-hover-contained` (not one with brightness-95 and another with opacity-90).
- `verifier`: verify-component-state-vocab.mjs

## token_discipline

- `rule`:
  components reference CSS vars via Tailwind v4 arbitrary-value syntax only:
  bg-[var(--color-primary)] / text-[var(--color-foreground)] / border-[var(--color-border)]
- `forbidden_in_component_sources`:
  - "hex colors: '#[0-9a-fA-F]{3,8}' (except inside shadcn baseline src/components/shadcn/, which is excluded)"
  - rgb/rgba/hsl/hsla function literals
  - "palette-shade classes: bg-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|white|black)-[0-9]+"
  - "direct Tailwind state variants inside src/components/ui/**/*.tsx: 'hover:', 'focus:', 'focus-visible:', 'active:', 'disabled:', 'group-hover:', 'peer-focus:', 'aria-busy:'"
- `exemptions`:
  - `src/components/shadcn/**`: regenerated by shadcn CLI; exempt from token-discipline check (separate edit-rule — never hand-edit)
  - `src/styles/**`: token + state-utility source files; exempt
  - `__stories__/**`: story files may use raw colors for display-only props demos
  - `__tests__/**`: tests may grep raw strings; exempt
- `verifier`: verify-component-tokens.mjs

## cross_variant_consistency

- `rule`: state_vocabulary.rule_of_consistency above — same interaction-state utility class across all entries of a cva `variant` group; per-variant invention is forbidden
- `detection_strategy`:
  - grep cva config files for `variant` blocks
  - extract per-variant class strings
  - extract substrings matching state-utility patterns (state-hover-*, state-focus-*, etc.)
  - refuse if entries within the same variant group disagree on any state prefix
- `verifier`: verify-component-state-vocab.mjs.cross_variant_consistency_check

## verifiers

- `location_root`: all verifier scripts live at ~/.claude/standards/scripts/verify/<script-name>
- `exit_codes`: every verifier exits 0 on green, 1 on red
- `exception_engine`:
  - `file`: ~/.claude/standards/scripts/verify/_load-exceptions.mjs
  - `rule`:
    EVERY verifier below consults <component>/__specs__/exception.yaml before failing. A
    violation whose `rule` matches an exception carrying a `reason:` is SKIPPED and logged as
    an accepted waiver. No file / no matching rule / no reason → the gate fails as normal.
    Schema: PROCESS_DISCIPLINE.
- `verify-component-research-cited.mjs`:
  - `blocks_when`: design.md exists but research.md is missing OR research.md is empty OR design.md text does not reference research.md
- `verify-component-design-self-lock-eligible.mjs`:
  - `blocks_when`: design.md carries `by:agent` marker AND any condition in autonomy.self_lock_eligibility.blocks_when_any_true fires
  - `note`: does NOT block by:user marker — that path skips this verifier entirely
- `verify-component-design-locked.mjs`:
  - `blocks_when`:
    any .tsx exists under src/components/ui/<Name>/ AND __specs__/design.md is missing OR
    lacks any accepted lock marker (by:user or by:agent) OR a source file's first git commit
    precedes the design.md's first git commit (code-before-spec evidence)
- `verify-component-spec.mjs`:
  - `blocks_when`: __specs__/spec.yaml exists but missing any required_top_level_field OR required_block (per component_spec_schema)
- `verify-component-tokens.mjs`:
  - `blocks_when`: src/components/ui/**/*.tsx contains any forbidden pattern in token_discipline.forbidden_in_component_sources (exemptions applied)
- `verify-component-state-vocab.mjs`:
  - `blocks_when`:
    any direct hover:/focus:/active:/disabled: Tailwind variant appears in
    src/components/ui/**/*.tsx OR any cva variant group has inconsistent state-class bindings
    across its entries

## enforcement_layers

- `layer_1_agent_self_check`:
  before any TaskCreate that includes component source-writing, the active session MUST read
  COMPONENT_CREATION.md and create spec-writing tasks first; before any Write/Edit on a
  .tsx under src/components/ui/<Name>/, the design.md lock marker MUST exist. CLAUDE.md
  Tier-1 names this rule.
- `layer_2_pre_commit_hook`:
  project's .husky/pre-commit calls all 4 verifiers on staged files. --no-verify is
  FORBIDDEN per CLAUDE.md; investigate violations instead.
- `layer_3_pnpm_verify_chain`: project's `pnpm verify` chain includes the 4 verifiers — after typecheck/lint/test, before build
- `layer_4_ci_gate`:
  NOT enforced. Enforcement is intentionally local-only (layers 1–3). A team that wants CI
  enforcement wires it as a project-local concern; the standard does not require it.

## bootstrap

- `step_1`: copy ~/.claude/standards/templates/component-states.css.template into project/src/styles/states.css (or equivalent)
- `step_2`: install husky as devDep; run `pnpm dlx husky init` to create .husky/
- `step_3`: write .husky/pre-commit calling the 4 verifiers — see ~/.claude/standards/templates/component-pre-commit.sh.template
- `step_4`:
  add pnpm scripts:
  "verify:component": "node ~/.claude/standards/scripts/verify/verify-component-spec.mjs &&
    node ~/.claude/standards/scripts/verify/verify-component-tokens.mjs &&
    node ~/.claude/standards/scripts/verify/verify-component-state-vocab.mjs &&
    node ~/.claude/standards/scripts/verify/verify-component-design-locked.mjs"
- `step_5`: when adding a component, follow phases in order; user inserts the design-locked marker in design.md to unblock implement phase

## anti_patterns

- writing source before design.md is locked
- writing spec.yaml after source ("spec mirrors code" is documentation, not a spec)
- "direct hover: / focus: / active: utilities in component source"
- per-variant hover invention (different effect per variant in the same cva config group)
- hardcoded hex / rgb / palette-shade classes in component source
- skipping the design.md anatomy diagram ("just words" — ASCII sketch is mandatory)
- re-running shadcn add over a hand-edited shadcn file (regenerate first; re-apply customizations second)
- bypassing pre-commit with --no-verify
- '"I''ll fix it after merge" — not for component primitives; locks set the precedent every later primitive inherits'

## sibling_tier_standards

- `COMPOSITE_CREATION.md`: tier-2 — composites consume atomic primitives; thin specs (composition + state propagation + focus order across atomics); inspects atomic specs at build time, does NOT re-state their contracts
- `PAGE_CREATION.md`: tier-3 — pages compose composites + atomics into routes/sidepanels/popups/embedded surfaces; adds landmark structure + state machine + responsive matrix + SEO/analytics/i18n + performance budget
- `shared_phase_0`: research.md mandatory across all 3 tiers; coverage_x_stakes_matrix + domain_survey_trigger_matrix govern all tiers; tier-specific extensions live in each tier's own yaml
- `shared_autonomy`: .standards/autonomy.yaml at project root governs all 3 tiers per-tier (atomic / composite / page mode keys)

Last updated: 2026-07-11T00:00:00Z