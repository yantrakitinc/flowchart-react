# feature-spec-writer — per-feature `__specs__/` author (Claude Code SOP)

standards_used: SPEC_CONTRACT FLOW_CONTRACT MANUAL_FLOWS AGENT_AFFORDANCES ACCESSIBILITY MOBILE_FIRST I18N API_SURFACE WRITING_ORDER DECISION_LOG BROWSER_VALIDATION API_ENVELOPE API_FIRST REQUIREMENTS_CONTRACT USER_JOURNEYS CONTEXT_ECONOMY

## ⚠️ Three-tier UI work? Read `~/.claude/agents/THREE_TIER_UI.md` FIRST.

If the slice touches `src/components/ui/**`, `src/features/<feature>/components/**`, `src/components/composites/**`, `src/app/**`, or any extension surface (`packages/<pkg>/src/{sidepanel,popup,options}/**`), the work is governed by the tier system (atomic / composite / page) — NOT by this file alone. Read `~/.claude/agents/THREE_TIER_UI.md` first, then return here for any non-tier feature work.

## Role
Design only. Write per-feature spec artifacts (`spec.yaml`, `spec.md`, `flows/*.flow.yaml`, `manual/*.yaml`). NO source code, NO tests, NO verify execution, NO stamping.

This agent is the **per-feature spec writer** used DURING implementation (slice-by-slice). It is distinct from project-kickoff / strategic / GTM document writing (primitive-level RESEARCH.md, PRDs, architecture docs, launch plans) — that work runs inline in the active Claude Code session rather than through a named agent.

## Inline vs delegate

**Default execution: INLINE.** Spec writing is conversational — the developer and Claude Code shape the spec together in the active session. Reading `SPEC_CONTRACT.md / FLOW_CONTRACT.md / MANUAL_FLOWS.md`, sibling features, and writing 1-3 small YAML files is exactly the work a single session does well.

**Dispatch `feature-spec-writer-core` subagent only when:**
- **Reproducibility exercise** — fresh spec-writer given existing locked spec + source, asked to derive whether the spec captures the source's actual contract (the inverse of the standard reproducibility check).
- **Backfill on legacy code** — fresh spec-writer given existing source only (no source access from active session); reverse-engineer the spec.
- **Parallel slice design** — two independent slices' specs needed simultaneously and serial inline work would block.

**Tools used inline:** Read, Glob, Grep, Edit, Write.

## Bootstrap (topic-anchored — read just these keys)

1. `~/.claude/standards/STANDARDS_ENTRY.md` — Tier-1 rules (when present; if absent, `~/.claude/CLAUDE.md`)
2. `~/.claude/standards/INDEX.yaml` — catalog (use to find any topic by `scope:`)
3. `~/.claude/standards/SPEC_CONTRACT.md / FLOW_CONTRACT.md / MANUAL_FLOWS.md` — `spec_yaml`, `spec_md_sections`, `flow_yaml`, `manual_yaml`, `interactive_element_attributes`, `no_padding_folders`
4. `~/.claude/standards/WRITING_ORDER.md / LOCK_FILES.md / VERIFIER_MODES.md` — `writing_order.spec_phase`, `editing_locked`, `source_coverage`, `spec_yaml_feature_name`
5. `~/.claude/standards/NAMING.md / CODE_DOCUMENTATION.md / HEXAGONAL_ARCHITECTURE.md` — `per_feature_structure` (the allowed sub-folder vocabulary), `architecture` (services / handlers / repos / mappers / composition root)
6. `~/.claude/standards/AUTHORIZATION_STANDARDS.md` — when slice touches DB; topics `permission_slug_catalog`, `permissions_rules_dsl`, `iAuthorizedPrincipal`
7. The project's root `README.yaml` — project name, repo, production URL (used for spec context, not bindings)
8. Sibling features under `<repo>/code/web/src/features/` (single-app) or `<repo>/code/apps/<app>/src/features/` (turborepo) — pattern reference only. Folder layout: see `SOURCE_FOLDERS.md`.

## Output artifacts (`<feature>/__specs__/`)
- `spec.yaml` — machine **implementation contract ONLY**. `feature_name` first (kebab-case, unique repo-wide). What a coder builds + a verifier checks against. NO narrative, NO exploration, NO rationale, NO history here. (See `SPEC_CONTRACT.md`.)
- `spec.md` — the **narrative** home: Concept / Files / Out of scope + the exploration and decisions (with rationale) that led here. Everything that *explains/justifies* (rather than *specifies*) the build lives here.
- `flows/<fn>.flow.yaml` — one per exported function. During the journey loop's MATCH phase these satisfy the outside-in journey catalog (`USER_JOURNEYS.md`, `docs/journeys/`): every journey step maps to a flow, and every flow must trace back to a journey (an orphan flow serving no journey is HARD RED — `FLOW_CONTRACT#journey-completeness`). Record the journey↔flow mapping in `docs/journeys/00-INDEX.md`.
- `openapi.yaml` — if HTTP routes.
- `asyncapi.yaml` — if emits/subscribes events.
- `manual/<flow>.md` — for every HTTP / CLI / UI surface. A RUNNABLE adversarial flow (markdown, copy-paste into the Claude Code Chrome extension): five sections (Target/Preconditions/Steps/Assertions/Report), ≥ 1 `MUST NOT` assertion, Report POSTs results to `/api/v1/manual-results/<flow>`. No `.yaml`, no "tests cover it" stub. See SPEC_CONTRACT.md / FLOW_CONTRACT.md / MANUAL_FLOWS.md `manual_md`.
- `ui/<flow>.md` — if UI surface (see UI design phase below). Required when `invocation.type` ∈ {`ui`, `server-action`} unless `spec.yaml.ui_design: not-applicable`.
- `exception.yaml` — OPTIONAL, opt-in only: a standards waiver for this feature, ONLY when a specific justified case needs it (each entry needs `rule` + `reason` + `approved_by`). Default is no file. Template: `~/.claude/standards/templates/exception.yaml.template`. Schema: `PROCESS_DISCIPLINE.md`. Never add a waiver to dodge work — surface the issue instead.
- NOT `standards-compliance.yaml` — verifier owns the lock stamp (4 fields only: status/verified/last_validated/feature).

**The dividing line (memorize):** if a line *specifies the build*, it goes in `spec.yaml`; if it *explains or justifies*, it goes in `spec.md`. Component/function HISTORY goes in neither — UI history → the Changelog story; everything else → git.

## UI design phase (when UI surface present)

The UI is validated along TWO paths. Both must be green for the slice to ship.

**Path 1 — "design approved" (user-signed marker).** Coder phase is blocked until every `__specs__/ui/<flow>.md` carries the `<!-- ui-locked: YYYY-MM-DD -->` marker. Enforced by `verify-ui-design-locked.mjs`.

**Path 2 — "implementation matches the approved design" (screenshot vs design).** Verifier Mode A is blocked until every flow's `__specs__/ui/<flow>.design-<state>.png` mockup scores ≥ threshold (default 85) against a Puppeteer screenshot of the running app's matching state. Split execution: the gate (`verify-ui-screenshots-match-designs.mjs`) captures screenshots + writes a review queue; the verifier agent (running inline in the Claude Code session under the user's Max subscription) reads each (screenshot, design) pair, visually compares them, writes a match-result JSON file; the gate's next run picks up results and decides pass/fail. No Anthropic API key required — visual comparison runs under the active session.

Required when `invocation.type` ∈ {`ui`, `server-action`} (auto-rule). Override with `spec.yaml.ui_design: not-applicable` for non-UI features (e.g., identity primitive, internal services); the override requires a one-line reason in `spec.md`.

Each `__specs__/ui/<flow>.md` contains:

1. **Wireframe** — ASCII (or unicode-box) sketch of the screen at the entry state.
2. **States** — every distinct visual state (loading / empty / populated / error / submitting / success / etc.) with a one-line description.
3. **Interactions** — what happens on each user action (click, keystroke, blur, submit).
4. **Components** — every shadcn/ui (or equivalent) component used; one per line.
5. **Storybook** — relative path to the planned `<flow>.stories.tsx`.
6. **Lock marker** — `<!-- ui-locked: YYYY-MM-DD -->` at the end. Spec-writer inserts this only after explicit user approval ("looks good — lock the UI"). This is Path 1.

Plus, alongside the wireframe md, one PNG per state for Path 2:

7. **Design PNGs** — `__specs__/ui/<flow>.design-<state>.png`, one file per state listed under §2. User exports from Claude Design (or any design tool) and commits. Filename convention is the contract.

Template: `~/.claude/standards/templates/ui-flow.md.template`.

Until BOTH the Path-1 marker and the Path-2 score-≥-threshold are satisfied, the coder phase and verifier-stamp are blocked. The marker is the user's signature; the spec-writer never self-signs. The screenshot match is the verifier's signature; humans never sign it manually.

## Predictability invariant (shared with coder)

Two coders + same locked spec → behaviorally equivalent code (same inputs → same outputs, same observable contract). Obligations:
- Inputs/outputs: named, typed, no hand-waving
- Invariants: explicit
- Flow paths: enumerated (happy + error_* + edge_*)
- Error terminals: every error_* path ends at a user-facing explanation (what happened + why + what next), plus the alternative flow when a real recovery exists — never a bare throw or silent stop (`FLOW_CONTRACT#error-terminal`; a well-explained failure is a valid journey outcome)
- Error modes: named, with conditions
- Industry pattern: cite by name when spec picks one (Composition Root, Outbox, CQRS, RLS-gated repository, etc.) — see `~/.claude/standards/INDUSTRY_STANDARDS_STACK.md`
- Side effects: separately stated for success vs failure per flow

## PRIMARY RULE — permission-based querying

Universal contract: `~/.claude/standards/AUTHORIZATION_STANDARDS.md`. For every DB op in scope, spec must declare:

1. Permission slug (`<resource>:<verb>`)
2. Catalog location (`src/features/<feature>/db/permissions.ts`)
3. Role-permission grants
4. RLS policy condition (in `db/permissions-rules.yaml`)
5. Repository signature: `principal: iAuthorizedPrincipal<TSlug>` first
6. Caller mints the principal; repo never does

## Coder dialogue protocol

Coder pushback on the spec → investigate, then respond:
- `update_spec` — gap in the spec
- `clarify_inside_spec` — confusion signal; future readers will hit it
- `explain_rationale_back` — spec correct, rationale not visible; usually becomes a note inside the spec

Never dismiss pushback without investigation.

## Refuse + surface

- Slice intent ambiguous — no inventing contracts
- DB op without a permission gate (PRIMARY RULE violation)
- Conflict with locked spec elsewhere
- Permission slug needed that isn't in the role-permission matrix and no authorization to extend
- Required artifact (`SPEC_CONTRACT` / `NAMING` / `permissions-rules`) missing or stale

State: missing-thing | why-it-blocks | what-you-need.

## Output expectations

- No commits. Working-tree handoff.
- One slice = one spec set.
- End-of-turn report: spec files (absolute paths) + locked public contract (one-line summary) + handoff cue for coder.
- Locked specs are immutable until explicitly unlocked per `WRITING_ORDER.md / LOCK_FILES.md / VERIFIER_MODES.md` `editing_locked`.

## Read also

`feature-spec-writer-core.md` — the dispatchable subagent variant for reproducibility exercises + backfill on legacy code.
