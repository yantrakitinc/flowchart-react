# Three-tier UI work — agent SOP

Read this FIRST whenever the work touches `src/components/ui/**`, `src/features/<feature>/components/**`, `src/components/composites/**`, `src/app/**`, `packages/<pkg>/src/{sidepanel,popup,options}/**`, OR any file with `__specs__/spec.yaml` where `tier ∈ {atomic, composite, page}`.

Applies to every agent role: `feature-spec-writer`, `coder`, `verifier`, `pm`.

## Step 0 — read the project's autonomy.yaml

Look up `<repo>/.standards/autonomy.yaml` (walk up from cwd up to 20 levels). If not found, defaults are: `ui_discipline: full`, `design_lock_mode: autonomous` for all 3 tiers.

The `ui_discipline` value gates everything:

- `none` → **non-UI project**; this entire SOP is "n/a". Do NOT create `__specs__/`, do NOT enforce design phase, do NOT run UI verifiers. Standard feature work follows SPEC_CONTRACT.md / FLOW_CONTRACT.md / MANUAL_FLOWS.md only.
- `crappy-permitted` → UI exists; design phase can be skipped per slice with **explicit user permission** ("user said skip design"). Verifiers warn but don't block. Don't volunteer this exemption — wait for explicit invocation.
- `full` → full 6-phase discipline below applies.

The `design_lock_mode` per tier governs whether the agent inserts `by:user` (review-locked) or `by:agent` (autonomous) markers:

- `autonomous` → after self-lock eligibility passes, agent inserts `<!-- design-locked: YYYY-MM-DD by:agent -->`.
- `review-locked` → agent NEVER inserts the marker; user does. Agent's job is to surface the spec + design files and stop.
- `mixed` → check `review_locked_overrides.<tier>` globs against the component path; if match, review-locked; else autonomous.

## Step 1 — classify the tier

Three tiers:

| Tier | Path pattern | Standard |
|---|---|---|
| `atomic` | `src/components/ui/<Name>/`, `packages/<pkg>/src/components/ui/<Name>/` | `~/.claude/standards/COMPONENT_CREATION.md` |
| `composite` | `src/features/<feature>/components/<Composite>/`, `src/components/composites/<Composite>/` | `~/.claude/standards/COMPOSITE_CREATION.md` |
| `page` | `src/app/<route>/`, `packages/<pkg>/src/{sidepanel,popup,options}/<name>/`, or any folder with `__specs__/spec.yaml` carrying `tier: page` | `~/.claude/standards/PAGE_CREATION.md` |

If the work touches multiple tiers in one slice (e.g. building a page that needs a new composite that needs a new atomic), the bottom-up rule applies: atomic ships first, composite second, page last. File separate issues; do NOT bundle.

## Step 2 — read the tier's standard

`COMPONENT_CREATION.md` (atomic), `COMPOSITE_CREATION.md` (composite), or `PAGE_CREATION.md` (page). Each has:

- `phases` — the 6-phase order (research → design → test → implement → stories → verify)
- `artifacts_required` — what files must exist at lock
- `<tier>_spec_schema` — what spec.yaml must contain
- `design_completeness_blocks` — what design.md must contain
- `verifiers` — what runs against the work

The atomic standard's `autonomy`, `coverage_x_stakes_matrix`, `domain_survey_trigger_matrix`, and `stakes_signal_source` blocks apply to ALL tiers — those don't repeat in the composite/page standards.

## Step 3 — Phase 0 (research) before anything else

Required artifact: `<component-folder>/__specs__/research.md`.

1. Self-classify on the coverage × stakes matrix:
   - `library_coverage` = full | partial | none — based on whether shadcn / MUI / DaisyUI ship a direct primitive
   - `stakes` = internal | standard | brand — resolved via autonomy.yaml.brand_surfaces / internal_surfaces glob → folder inference → default `standard`
2. Compute depth: light | medium | thorough (per matrix in `COMPONENT_CREATION#coverage-x-stakes-matrix`).
3. Compute domain_survey_trigger: skip | brand-language-only | targeted-gaps | mandatory-full.
4. Execute the research:
   - At least one doc fetch per relevant library (shadcn-ui.com, mui.com, daisyui.com) — use WebFetch.
   - Domain survey (when triggered): WebSearch with named industry leaders from the standards' lookup table (forum → Discourse/Reddit/HN; chat → Slack/Discord/Element; etc.).
   - Capture URLs cited in the research.md — verifier checks they're real APG / library / industry URLs.
5. Write `research.md` from the template at `~/.claude/standards/templates/research.md.template`.
6. Page tier: domain survey is MANDATORY regardless of matrix.

## Step 4 — Phase 1 (design)

Write the tier's spec.yaml, spec.md, design.md, flows/, manual/, standards-compliance.yaml. Use the tier-specific templates:

- Atomic: `~/.claude/standards/templates/{component-spec.yaml.template, component-design.md.template, ...}`
- Composite: `~/.claude/standards/templates/{composite-spec.yaml.template, composite-design.md.template, ...}`
- Page: `~/.claude/standards/templates/{page-spec.yaml.template, page-design.md.template, ...}`

Design.md MUST cite research.md.

Composite spec MUST list `consumed_atomics` with each entry's locked SHA pinned at lock time (the atomic's `git rev-parse HEAD` when the atomic's standards-compliance.yaml was last flipped to `status: locked`).

Page spec MUST list `consumed_composites` + `consumed_atomics` with the same SHA pinning.

When the design is complete:

- If mode is `autonomous`: run the verifier chain BEFORE inserting the lock marker. If `verify-component-design-self-lock-eligible` is green, insert `<!-- design-locked: YYYY-MM-DD by:agent -->` at the bottom of design.md. If red, fix the gaps and retry.
- If mode is `review-locked`: surface the spec/design files to the user and stop. Do NOT insert the marker.

## Step 5 — Phase 2–5 (test → implement → stories → verify)

**spec.yaml is implementation-only; narrative goes in spec.md / design.md.** spec.yaml carries the impl contract (public_api, tokens_consumed, state_classes_consumed, test_coverage; optional interaction_states/touch_target/contrast). Anatomy / ARIA / keyboard / responsive / edge-cases → design.md. Concept / exploration / decisions → spec.md. Component HISTORY → the Changelog story (never JSDoc/comments/spec.yaml).

**Stories phase ships exactly 3 max:** Playground (required) + AllVariants (optional) + Changelog (required, newest-first). JSDoc is parent-facing only; inline comments minimal. `standards-compliance.yaml` = 4 fields only.

**Standards waiver:** if one specific check genuinely cannot pass for a justified reason, the feature MAY carry `__specs__/exception.yaml` (`rule` + `reason` + `approved_by`); every verifier consults it. It is the opt-in escape hatch of last resort — surface the issue first, never waive to dodge work.

Same shape across tiers. The verifier chain at each tier extends the previous:

- Atomic: 6 verifiers (`verify-component-{research-cited, design-self-lock-eligible, design-locked, spec, tokens, state-vocab}.mjs`).
- Composite: atomic 6 + 2 composite (`verify-composite-{composition, state-propagation}.mjs`).
- Page: atomic 6 + 2 page (`verify-page-{landmarks, state-machine}.mjs`).
- Plus shared: `verify-component-spec-matrix-completeness.mjs`, `verify-component-research-depth.mjs`, `verify-cross-tier-freshness.mjs` (when present).

Implementation phase rules (token discipline + state vocabulary) are identical across tiers. Component source NEVER uses direct `hover:` / `focus:` / `active:` Tailwind variants. Component source NEVER carries hex / rgb / palette-shade colors. Both are mechanically enforced.

## Step 6 — when a lower-tier primitive doesn't exist

If a composite needs an atomic that doesn't ship: file an issue against the atomic; do NOT fork or inline.
If a page needs a composite that doesn't ship: file an issue against the composite.

The bottom-up lock order is mandatory. Phase 2+ of the higher tier is BLOCKED until the lower tier locks. The agent can run Phase 0 + 1 (research + design) of the higher tier in parallel with the lower tier's work, but tests + source on the higher tier wait.

## Step 7 — multi-agent dispatch

When the work is large enough to warrant subagent dispatch (per the AGENT_ARCHITECTURE):

- **feature-spec-writer-core**: dispatch for Phase 0 + 1 of a single tier slice. Pass it the component folder path and the tier classification. It reads this SOP first, then the tier standard, then writes the spec artifacts.
- **coder-core**: dispatch for Phase 2 + 3 of a single tier slice. Pass it the locked design.md path and the spec.yaml path. It writes tests + source.
- **verifier-core**: dispatch for Phase 5 if the verifier chain is heavy (Mode C/D). Pass it the component folder path. It runs the full chain and reports.

Each subagent reads this SOP at its boot. The autonomy.yaml mode applies to the subagent identically.

## Step 8 — emergencies

If the agent is mid-slice and discovers the tier classification is wrong (e.g. started as composite but the work is actually atomic OR vice versa):

1. STOP and surface to the user. Don't silently re-classify.
2. The fix is usually: file a new issue, move the work, start the new tier's Phase 0.

If the agent is mid-slice and the autonomy mode changes (user switches `review-locked` → `autonomous` mid-flight):

1. The change takes effect for the NEXT phase, not retroactively.
2. Already-shipped artifacts keep their lock marker (the audit trail stays accurate).

## What this SOP does NOT cover

- Feature-folder components NOT under any of the 3 tiers (`src/features/<feature>/components/SomeNonComposite.tsx`) — follow `SPEC_CONTRACT.md / FLOW_CONTRACT.md / MANUAL_FLOWS.md` only. Most feature work is NOT a primitive; don't force tier discipline on it.
- Pure utility modules (`src/lib/cn.ts`, `src/utils/`) — no tier; no design phase; standard module discipline.
- Storybook config files, .husky hooks, scripts — no tier.

## Versioning

`version: 1` — first ship of three-tier SOP. Updates follow standards bumps.

Last updated: 2026-06-01T00:00:00Z
