# WRITING_ORDER

> agent needs to APPLY and ENFORCE: the three-phase writing order (spec → code → verify), the drive-to-green loop,
editing a locked feature, the coverage bar, scope authority, and standards-change authority. The lock file the verify
phase stamps: LOCK_FILES.md. ---------- product-level journey phase (precedes every feature) ---------- The circular
journey↔flow loop (USER_JOURNEYS.md) runs at PRODUCT level BEFORE any per-feature writing order below. Journeys + the
flows that satisfy them exist as a reconciled map before a line of code is written.

```meta
version: 1
last_updated: 2026-07-19T16:43:58Z
```

## journey_phase

- `owner`: pm _(orchestrates the loop; dispatches journey-cartographer-core for blind discover)_
- `precedes`: writing_order _(no feature spec_phase starts before journeys are reconciled to flows)_
- `loop`: USER_JOURNEYS#journey-loop _(discover (blind) → match → reconcile → update)_
- `output`: docs/journeys/{J-<NNN>-<slug>.md, 00-INDEX.md}
- `gate_before_features`: docs/journeys/00-INDEX.md shows every journey step mapped to a flow AND no orphan flow (USER_JOURNEYS#reconciliation verdict = YES); feeds the user-locked requirements (REQUIREMENTS_CONTRACT.md) that the writing_order below derives from

## writing_order

- `spec_phase`:
  - `owner`: feature-spec-writer
  - `output`: __specs__/{spec.md, spec.md, flows/, manual/ for EVERY HTTP|UI surface (mandatory; never omitted), ui/ if UI surface, openapi.yaml if HTTP, asyncapi.yaml if events}
  - `hands_off_to`: coder
  - `steps`: 1: write __specs__/spec.md AND __specs__/spec.md 2: write __specs__/flows/<fn>.flow.md for every
    exported function 3: write __specs__/openapi.yaml if invocation.type=http 4: write __specs__/asyncapi.yaml if
    folder emits/subscribes events 5: 'write __specs__/manual/<flow>.md for EVERY HTTP / CLI / UI surface — MANDATORY,
    never skipped. A RUNNABLE adversarial flow (copy-paste into the Claude Code Chrome extension; drives the surface,
    POSTs results to /api/v1/manual-results/<flow>, prints them), NOT a copy of flows/ or the tests. Markdown only;
    five sections (Target/Preconditions/Steps/Assertions/Report); >= 1 "MUST NOT" assertion. NO automated-complete
    escape hatch, NO .yaml form — "tests already cover it" is non-compliant; an absent flow for a callable surface is
    non-compliant. See MANUAL_FLOWS#manual-md + MANUAL_FLOWS#manual-flow-surfaces.' 6: 'write __specs__/ui/<flow>.md
    if invocation.type in (ui, server-action) AND spec.md.ui_design != not-applicable; route to user for sign-off;
    user inserts `<!-- ui-locked: YYYY-MM-DD -->` marker in each file after approving (spec-writer NEVER self-signs)'
    7: drop __specs__/ui/<flow>.design-<state>.png for every state declared in <flow>.md (one PNG per state); user
    exports from any design tool and commits; filename convention is the contract
  - `blocks_coder_phase_until`:
    Path 1: every required __specs__/ui/<flow>.md carries `<!-- ui-locked: YYYY-MM-DD -->` (enforced by verify-ui-design-locked.mjs). Coder phase cannot start without this.
    Path 2 is checked at verify-phase: every required __specs__/ui/<flow>.design-<state>.png scores ≥ ui_screenshot_match_threshold against the Puppeteer screenshot of the matching state (enforced by verify-component --check ui-screenshots-match-designs.mjs). Verifier Mode A cannot stamp the lock without this.
    Features with spec.md.ui_design: not-applicable skip BOTH paths; a one-line reason in spec.md is required.
- `code_phase`:
  - `owner`: coder
  - `output`: source + __tests__/ (red/green TDD with targeted runs allowed)
  - `dialogue_required_with`: feature-spec-writer (when spec is unclear / contradictory / suboptimal)
  - `hands_off_to`: verifier
  - `steps`: 1: write the code (driven by the specs) 2: add JSDoc on every exported function (1-3 lines; detail lives in spec) 3: write __tests__/<code>.test.ts — 100% coverage required (perFile) 4: run targeted `pnpm vitest run <slice-path>` for red/green TDD; NEVER run full verify chain
- `verify_phase`:
  - `owner`: verifier
  - `mode`: A _(semantics: LOCK_FILES#verifier-modes)_
  - `output`: __specs__/standards-compliance.md stamped on green (status:locked, verified:100%, last_validated:<utc-now>) per LOCK_FILES#schema
  - `on_green`: orchestrator may tag compliant/<sha> (see LOCK_FILES#compliant-tag)
  - `on_fail`: drive-to-green loop (see verify_phase_drive_to_green)

- `verify_phase_drive_to_green`:
  - `owner`: orchestrator (Claude Code session OR pm agent OR verifier-core dispatcher)
  - `max_attempts`: 5
  - `behavior`:
    - `on_fail_attempt_lt_max`:
      1. capture verifier's reproduction block verbatim
      2. capture attempt counter (N of MAX)
      3. re-dispatch coder with reproduction + counter
      4. coder iterates source/tests to address EVERY failure in the reproduction
      5. re-dispatch verifier Mode A
      6. increment attempt counter; reset on green
    - `on_fail_attempt_eq_max`:
      SURFACE to user — do not iterate further. Surface contents:
      - all 5 attempts' verifier reproduction blocks (verbatim)
      - all 5 attempts' coder change-summary (file paths + 1-line per change)
      - the unchanging root cause (best-guess from the orchestrator)
      - ask: "spec gap? environmental issue? human design call needed?"
    - `on_green`: stamp + proceed per writing_order.verify_phase
  - `counters`: per-slice (per branch + per feature-path); reset on green; reset on user-triggered "start over"
  - `forbidden`:
    - skipping any verifier output between attempts (never paraphrase the reproduction to the coder)
    - swallowing FAIL silently (the user MUST see attempt 5 surface)
    - bumping max_attempts past 5 without user authorization

## editing_locked

- `shape`: same three phases as writing_order (spec_phase → code_phase → verify_phase)
- `spec_phase_start`: set standards-compliance.md status=unlocked
- `steps`: 1: set status=unlocked 2: feature-spec-writer updates __specs__/spec.md + __specs__/spec.md + flows/ +
  manual/ 3: coder updates source + __tests__/ (100% maintained) 4: verifier Mode A re-runs targeted gates on the
  slice + blast radius 5: verifier re-stamps standards-compliance.md (status=locked, last_validated=<now-utc>) on
  green 6: orchestrator commits; emits new compliant/<sha> tag on green Mode D (see LOCK_FILES#compliant-tag)

## forbidden

- editing code before updating the spec
- coder silently deviating from the spec
- coder running pnpm verify / typecheck / lint / coverage as a release gate
- skipping verifier Mode A on a slice
- bumping last_validated without a real walk

## test_coverage

- `threshold`: 100% _(lines / branches / functions / statements)_
- `cant_reach_100_percent`: split the file or refactor for testability
- `skip_exception`: physically or mathematically impossible only
- `banned_excuses`:
  - too long
  - too many tests required
  - improbable

## spec_yaml_scope_authority

- `rule`: optional spec.md field; one of {user, claude}; default "user"
- `when_claude`:
  - `coder_may_decide_without_asking`:
    - helper extraction (private functions inside the feature folder)
    - internal field/column naming within the operation's domain
    - test fixture choice (placeholder names from CLAUDE.md "Placeholder names" convention)
    - log-key naming
    - private type-alias naming
  - `coder_must_still_surface`:
    - invocation.type changes
    - public API shapes (request_schema / response_schema)
    - permission slugs
    - data destruction (DROP/DELETE/TRUNCATE)
    - third-party API choice
    - library / framework choice
    - any spec edit that alters behavior visible to a caller
- `default_user_behavior`: surface every in-scope decision per CLAUDE.md "Do exactly what is asked"
- `enforced_by`: coder agent reads the field at code-phase start; enum validation lives inline in the coder + spec-writer SOPs

## standards_change_authority

- `rule`: standards changes (any edit to ~/.claude/CLAUDE.md or ~/.claude/standards/*) always surface to the user for explicit approval; the agent never auto-patches standards mid-slice — not even for one-paragraph doc clarifications
- `applies_to`: ~/.claude/CLAUDE.md + ~/.claude/standards/*.{yaml,md,detail.md} + vendored copies
- `procedure`: 1: surface the proposed change verbatim in the end-of-turn report 2: user explicitly approves before the edit lands 3: standards changes ship in their own focused PR, never bundled into a feature slice

Last updated: 2026-07-19T16:43:58Z