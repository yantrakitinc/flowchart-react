# LABS

> Scope: the /labs visual sandbox — a flow-backed surface set where UI/UX is SEEN and refined before product UI is
locked, plus the tiered discipline, the feedback protocol, and the extended-Mermaid auto-play walkthrough. Siblings:
FLOW_CONTRACT.md (flows + labs_realization), USER_JOURNEYS.md (journeys), DESIGN_TOKENS.md + STATE_VOCABULARY.md
(adopted at the Refine tier), MOBILE_FIRST.md. ---------- what /labs is ----------

```meta
version: 1
last_updated: 2026-07-25T15:22:50Z
```

## labs

- `purpose`: a flow-backed visual sandbox to SEE and refine UI/UX before product UI is locked
- `index`: /labs is the HUB/INDEX (lists the flows, and per flow its themes × variants × tier) — it is the starting page, NOT "the labs site"; the surfaces live under it
- `nothing_unbacked`: no labs surface exists without a flow/journey backing it (flow_labs_mapping)

## hard_rules

_apply to EVERY labs surface, both tiers_

- `flow_backed`: the surface maps to >= 1 flow/journey (bidirectional — flow_labs_mapping)
- `mobile_pwa_first`: designed mobile-up, PWA-capable — MOBILE_FIRST.md applies
- `full_real_estate`: use the whole viewport; a fixed narrow center column is NON-COMPLIANT
- `auto_playable`: the surface is real interactive DOM the player can drive — every actionable element carries data-testid + data-agent-action (AGENT_AFFORDANCES.md), never a static image

## placement

- `mode`: enum[route, separate_app, hybrid] _(every rule below holds regardless of mode)_
- `route`: a /labs route on the project's OWN port/app — cheapest; fits standalone projects
- `separate_app`: a sibling labs app that READS the project's flow/journey docs and renders from them — fits exploring a design BEFORE product components exist
- `hybrid`: a separate labs app that imports a shared component/token library + the flow specs — fits once such a shared library exists
- `selector`: <repo>/.standards/labs.yaml.placement picks the mode; default route
- `enabled`: <repo>/.standards/labs.yaml.enabled (bool) — when false, the labs gate is n/a for that repo

## flow_labs_mapping

- `forward`: every flow has >= 1 labs surface _(gap = a flow with nothing to see = red)_
- `reverse`: every labs surface maps to >= 1 flow _(gap = an unbacked surface = red)_
- `verdict`: EXACTLY TWO answers — YES (both directions 0 gaps) or NO (name the gap). Same discipline as USER_JOURNEYS#reconciliation; no "mostly", no percentage other than 100
- `manifest`: each surface declares its flow/journey id(s) + tier in a labs manifest (labs.yaml or front-matter) — flow ids reference existing flows/<fn>.flow.yaml
- `index`: docs/labs/00-INDEX.md maps every surface -> flow(s) and every flow -> surface(s)
- `index_terminal_lines`: ["unbacked_surfaces: 0", "uncovered_flows: 0"] _(both MUST be 0)_
- `enforced_by`: scripts/verify/verify-labs.mjs

## tiers

- `explore`:
  - `discipline`: free-form — NO design-token or state-vocabulary requirement; exempt from the 6-phase component lock/spec gates (COMPONENT/COMPOSITE/PAGE_CREATION). Diverge wildly and fast.
  - `still_obeys`: the four hard_rules
- `refine`:
  - `discipline`: the chosen direction MUST adopt DESIGN_TOKENS.md + STATE_VOCABULARY.md before it may feed product UI/UX — a Refine surface with hardcoded colors / ad-hoc state variants is red
  - `still_obeys`: the four hard_rules
- `promotion`: explore -> refine is gated on (a) tokens + state-vocabulary adopted AND (b) no open flow-affecting feedback item (feedback_protocol.gate)

## feedback_protocol

- `behavior`:
  - COLLECT a batch of feedback and ANSWER the user's questions first — do NOT start editing until the user explicitly says "apply"
  - triage EVERY item as either flow_affecting (changes what the flow does) or cosmetic (pure UI/UX)
  - when the user says "apply", update FLOWS first (re-run the journey/flow gates), THEN update UI/UX — never UI-only when a flow is affected, and never the reverse order
- `tally`:
  - `source`: docs/labs/feedback/<date>.yaml _(machine source of truth)_
  - `view`: docs/labs/feedback/<date>.md _(generated human-readable view)_
  - `item`:
    - `id`: string
    - `raw`: string _(the feedback verbatim)_
    - `triage`: enum[flow, cosmetic]
    - `target`: string _(flow-id | surface-id it applies to)_
    - `status`: enum[open, addressed]
- `gate`: promotion (explore->refine) AND feeding product are BLOCKED while any triage:flow item is status:open — enforced by verify-labs.mjs
- `enforced_by`: scripts/verify/verify-labs.mjs

## auto_walkthrough

- `player`: an in-app JS/React library — client-side only, runs on ANY browser AND on mobile, no Playwright/Puppeteer runner required. It is a VISUAL DEMO, never an E2E assertion.
- `drives`: the real interactive labs DOM via data-testid / data-agent-action selectors — moves a simulated cursor, clicks real elements, fills fields, selects options; the UI genuinely transitions
- `format`: extended_Mermaid — the flow's Mermaid path graph EXTENDED so each node/edge carries a binding map of event, sequence, action, and a ui_binding (a selector or surface-state)
- `single_origin`: the extended-Mermaid stays reconciled to flows/<fn>.flow.yaml — its steps map 1:1 to the flow's paths; the player NEVER invents, skips, or reorders a step (a presentation layer may tune cursor motion / timing / pauses, but not the step sequence)
- `symmetric`: the library reads the format two directions — PLAY (author -> animate) now; RECORD (capture a real user's actions -> emit the same extended-Mermaid -> replay) is phase p4
- `trigger`: /labs lists the flows; picking one animates that flow on its surface

## phasing

- `p1`: the labs doctrine — flow-backed surfaces (bidirectional), Explore/Refine tiers, feedback protocol, mobile/PWA-first + full real estate. This standard governs p1.
- `p2`: the flow-player library + extended-Mermaid binding; auto-play on labs
- `p3`: the player drives a live site running in a test container, for real E2E visualization
- `p4`: record real user sessions -> extended-Mermaid -> support replay ("session as flow chart"); its action logging touches privacy / PII / consent (RULE 0 world) — designed at that phase, not before

## enforced_by

scripts/verify/verify-labs.mjs _(placement-aware; green when labs is not enabled for a repo)_

Last updated: 2026-07-25T15:22:50Z