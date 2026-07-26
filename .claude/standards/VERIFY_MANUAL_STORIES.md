# VERIFY_MANUAL_STORIES

> ---------- per-component Verify-Manual story ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## verify_manual

- `name`: Verify-Manual
- `required`: true
- `spec_derived`: true
- `is_instructions_only`: true _(CRITICAL — see verify_manual_separation below)_
- `rule`:
  INSTRUCTIONS ONLY — a SPEC-DERIVED runbook: WHAT the Claude Code Chrome extension tests
  + WHAT the spec promises. No component render, no results form — prose + a checklist,
  nothing else. Authored CODE-BLIND from spec.md + design.md + __specs__/manual/<flow>.md,
  so running it validates the component AGAINST the contract AND proves the spec accurate.
  A flow unwritable from the spec = deficient spec — fix the spec (per MANUAL_FLOWS.md).
- `shape`:
  a Story carrying ONLY the runnable QA instructions (same content as __specs__/manual/<flow>.md):
    - WHERE to operate: link to this component's Playground story (a specific Showcase story
      ONLY when Playground genuinely cannot reach a state the spec requires) — story contracts
      owned by STORY_FORMAT#story-file.
    - WHAT to do: every state/prop/action the SPEC declares, step by step.
    - WHAT to assert: the spec's MUST / MUST-NOT.
    - WHERE to record: the single form on the Verify-Manual » Master page (see
      verify_manual_master). The story MUST state, in words, that the verdict + findings are
      entered into the Master page form, which POSTs to /api/v1/manual-results/<flow>.
- `forbidden`:
  - rendering the component itself inside the Verify-Manual story (that is Playground's job — never duplicate the render)
  - an inline verdict / PASS-FAIL / findings / Save form inside the Verify-Manual story (the form lives ONCE, on the Master page)
  - any code copied from Playground, Showcase, or the Master form — Verify-Manual references them by link, it does not repeat them

## verify_manual_master

- `name`: Verify-Manual » Master
- `required`: true
- `cardinality`: exactly ONE per Storybook (a top-level entry, NOT per-component)
- `contents`: 1: the agent runbook (how to run a verification pass) 2: the worklist — every component's Verify-Manual story, linked, one row each 3: ONE results form — Component (storyId) selector + Verdict (PASS/FAIL) + Findings + Save — POSTing each saved verdict to /api/v1/manual-results/<flow> (the local-only route)
- `shape`:
  a single top-level Story `verify-manual--master`. Form controls carry the agent hooks
  (data-agent-action="verdict-pass|verdict-fail", verdict-findings, save-verdict) so the
  extension can fill + submit it. Worklist links are generated from the registered stories,
  not hand-maintained.
- `sidebar_position`: does NOT count against any component's six-entry cap (STORY_FORMAT#story-file)

## verify_manual_separation

- `rule`:
  Three distinct, non-overlapping homes — never copy one into another:
    - Playground → the component you OPERATE (live, controllable render). One per component.
      (Contract: STORY_FORMAT#story-file.)
    - Verify-Manual → the spec-derived test INSTRUCTIONS. No render, no form. Points to
      Playground (operate here) + Master (record here). One per component.
    - Verify-Manual » Master → the ONE runbook + worklist + results form for the whole library.
  Only when the spec needs a state Playground cannot reach does a Showcase story carry that
  state, and Verify-Manual links to it. Showcase is the exception, never the default.

Last updated: 2026-07-12T00:00:00Z