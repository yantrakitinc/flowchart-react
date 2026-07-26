# labs — SOP (Claude Code reads this inline)

standards_used: LABS FLOW_CONTRACT USER_JOURNEYS DESIGN_TOKENS STATE_VOCABULARY MOBILE_FIRST AGENT_AFFORDANCES CONTEXT_ECONOMY

You build and maintain a project's `/labs` — the flow-backed visual sandbox where UI/UX is seen and refined before product UI is locked. Read `LABS.md` as the contract; this is how you apply it. Dispatch the `labs-core` subagent only for bulk surface generation (many flows at once) — single-surface work runs inline (per CONTEXT_ECONOMY dispatch_discipline).

## Before building anything

- Read `<repo>/.standards/labs.yaml` for `enabled` + `placement` (route | separate_app | hybrid). If absent/`enabled:false`, labs is off for this repo — do not scaffold it.
- Every surface you create maps to an existing flow (`flows/<fn>.flow.yaml`) and/or journey. No flow behind it → do not build it. Never invent UI for an intent no flow models.

## The four hard rules (both tiers, no exceptions)

1. **Flow-backed** — the surface declares its flow/journey id(s) + tier in its labs manifest; record it in `docs/labs/00-INDEX.md`.
2. **Mobile/PWA-first** — build mobile-up (MOBILE_FIRST). Never desktop-first.
3. **Full real estate** — use the whole viewport. A fixed narrow center column is non-compliant; correct it on sight.
4. **Auto-play-able** — real interactive DOM; every actionable element carries `data-testid` + `data-agent-action` (AGENT_AFFORDANCES) so the player can drive it. No static-image mockups.

## Tiers

- **Explore** — free-form; no design-token/state-vocab requirement; diverge fast. Still obeys the four hard rules.
- **Refine** — the chosen direction must adopt DESIGN_TOKENS + STATE_VOCABULARY before it may feed product UI/UX. A Refine surface with hardcoded colors or ad-hoc state variants is red.
- **Promote Explore→Refine** only when tokens+state-vocab are adopted AND no flow-affecting feedback is open.

## The flow↔labs map (bidirectional, binary)

Maintain `docs/labs/00-INDEX.md` with both terminal lines at 0: `unbacked_surfaces: 0` and `uncovered_flows: 0`. Either non-zero = the answer is NO; name the gap. Same discipline as journeys↔flows.

## The feedback protocol (this is how you behave when the user reviews)

- **Collect the batch and answer the user's questions FIRST. Do NOT edit until the user says "apply."** Answering often changes what the feedback means.
- Triage every item: **flow-affecting** (changes what the flow does) vs **cosmetic** (pure UI/UX). Record each in `docs/labs/feedback/<date>.yaml` (source of truth: `{id, raw, triage, target, status}`) and regenerate the `.md` view.
- **On apply: update flows first** (edit `flows/`, re-run verify-journeys + verify-api-first + the flow gates), **then UI/UX.** Never UI-only when a flow is affected; never the reverse order.
- A `triage:flow` item at `status:open` blocks promotion and product-feed (verify-labs gate).

## The auto-play player (P2 — wire bindings now, player library later)

The walkthrough script is the flow's own `mermaid:` graph, extended so each node carries `{event, sequence, action, ui_binding}` (LABS#auto-walkthrough). Keep it single-origin with `flow.yaml` — steps map 1:1, never invent one. The player is in-app JS/React, a visual demo (not an E2E test), runs on any browser + mobile.

## Done means

`node ~/.claude/standards/scripts/verify/verify-labs.mjs` green (flow↔labs reconciled both directions, no open flow-affecting feedback) — quote its final line. Read also `labs-core.md` for the dispatch contract.
