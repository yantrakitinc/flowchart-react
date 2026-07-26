# VERIFY_MANUAL_STORIES — detail

Why each rule in `VERIFY_MANUAL_STORIES.md` exists.

## Why this standard exists at all

Manual verification of a component is only trustworthy when the instructions are derived from the CONTRACT, not from the code. A Verify-Manual story authored code-blind from spec.md + design.md + the manual flow script tests the component against what it promises — and simultaneously proves the spec is complete enough to drive a browser agent. A flow that cannot be written from the spec exposes a deficient spec, which is the defect to fix (`MANUAL_FLOWS.md`).

## Why instructions-only

Rendering the component inside Verify-Manual would duplicate Playground's render — two renders drift, and the agent ends up testing a surface users never get. The story is prose + a checklist that points at Playground (operate here) and at the Master page (record here). Nothing else.

## Verify-Manual » Master — why one page

Separation of concerns, single source of each thing: the component renders once (Playground), the verdict form exists once (the Master page), and each component's Verify-Manual story is only the spec-derived instructions that point at both. Nothing is duplicated across components. The worklist is generated from the registered stories so it can never go stale against the sidebar.

## Why the form carries agent hooks

The results form's `data-agent-action` attributes (`verdict-pass|verdict-fail`, `verdict-findings`, `save-verdict`) let the Chrome-extension agent fill and submit the verdict without guessing selectors — the same agent-affordance discipline that governs every interactive element (`AGENT_AFFORDANCES.md`).

Last updated: 2026-07-12T00:00:00Z
