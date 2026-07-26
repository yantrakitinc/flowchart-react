# LABS — detail

Why each rule in `LABS.md` exists. One section per YAML section.

## Why labs exists, and why it is flow-backed

There is a gap between a flow written down and a design you can believe in. A flow says what the product does; it does not let you *see* it. Labs closes that gap: a surface you can open in a browser and look at, rendered from the flow, so a design language can be chosen and refined before product UI is committed. The discipline that keeps labs honest is that nothing appears in it that no flow backs. A labs surface with no flow behind it is a picture of a product decision nobody made — it invites building UI for intents that were never modelled. Requiring a flow behind every surface keeps the sandbox anchored to the same source of intent as everything else.

`/labs` is the hub, not the destination. It is the index a person lands on and browses from — the flows, and for each flow its themes, variants, and tier. The surfaces live under it. Calling `/labs` "the labs site" misreads it; it is the table of contents.

## Why the four hard rules bind both tiers

The tiers differ in how much design discipline they carry, but four things never relax. **Flow-backed** is the anchor above. **Mobile/PWA-first** exists because past explorations were built desktop-first and then failed on the device most users actually arrive on; modelling mobile-up from the start is cheaper than retrofitting. **Full real estate** is a direct correction: explorations that shrink to a fixed narrow center column waste the screen and mislead the eye about how the design breathes at real width — labs must use the whole viewport. **Auto-play-able** means every surface is real, interactive DOM with the agent affordances (`data-testid` / `data-agent-action`) the player needs to drive it. A static image cannot be walked, cannot be refined into product, and cannot be recorded — so it is not a labs surface.

## Why placement is per-project and the doctrine is placement-agnostic

Projects differ. A standalone project already has an app and a port, so a `/labs` route on it is the cheapest home. A design being explored before its product components exist cannot live inside an app that has none, so a separate labs app that reads the flow docs fits. A monorepo with a shared component and token library can render real components in isolation, so a hybrid app fits. Forcing one placement on all three would make labs awkward for two of them. The rules — flow-backing, tiers, feedback, the player — do not depend on where the surface is hosted, so the standard fixes the rules and lets each project pick the mode in its own `.standards/labs.yaml`.

## Why the flow↔labs mapping is bidirectional and binary

The same reasoning as journeys↔flows. Forward: a flow with no labs surface is a decision you cannot see, so it cannot be refined — a hole. Reverse: a labs surface with no flow is scope built for its own sake — dead weight that still demands themes, variants, and maintenance. Both are defects, surfaced by one map, and the verdict is binary because "mostly covered" is a lie you can tell yourself while a real gap sits in either direction. `unbacked_surfaces: 0` and `uncovered_flows: 0`, or the answer is NO and you name the gap.

## Why the tiers, and why discipline waits for Refine

Exploration and refinement want opposite things. Exploration wants to diverge — many wildly different looks, fast, unencumbered by tokens or a shared state vocabulary, because forcing a design system onto a throwaway sketch kills the divergence that makes exploration worth doing. Refinement wants to converge — the chosen direction has to become something product can actually adopt, which means it must speak in design tokens and the shared state vocabulary or it will not translate. So Explore is deliberately loose and Refine is deliberately disciplined, and promotion between them is the gate where the system snaps into place. A Refine surface with hardcoded colors is not refined; it is an Explore surface wearing the wrong label.

## Why the feedback protocol is collect-then-answer, not edit-on-hear

Reacting to each piece of feedback the instant it arrives produces thrash: half-applied changes, edits that a later comment contradicts, and a session that never actually answered the questions the reviewer was asking. The protocol inverts this. Feedback is collected as a batch and the reviewer's questions are answered first, because the answers often change what the feedback even means. Nothing is edited until the reviewer says "apply." Then every item is triaged — does it change what the flow *does* (flow-affecting) or only how it looks (cosmetic) — because the two are fixed in different places and in a fixed order: flows first, re-gated, and only then UI/UX. Applying a cosmetic fix to a flow-affecting comment leaves the flow wrong and the UI right about the wrong thing.

The tally is kept in two forms on purpose. The YAML is the source a gate can read, so promotion can be blocked mechanically while any flow-affecting item is still open; the generated Markdown is the form a person can review. One would drift from the other if hand-maintained, so the Markdown is generated from the YAML.

## Why the player is an in-app visual demo, not real browser automation

The player's job is to let someone *watch a flow happen* — a simulated cursor moving, forms filling, a journey playing out — anywhere they can open a page, including a phone. Real-browser automation (Playwright, Puppeteer) needs a headless runner and a host that can spawn it, which a phone browser cannot. So the player is plain client-side JS/React that drives the real labs DOM directly. It is explicitly *not* an E2E test: it asserts nothing, it demonstrates. Confusing the two would load the demo with test infrastructure it does not need and cannot run where it has to run.

## Why the format is extended Mermaid, single-origin with the flow

Flows are already authored with a Mermaid graph of their paths. Rather than invent a second artifact that would drift, the player's script *is* that graph, extended so each node and edge carries the binding a demo needs — the event, the sequence, the action, and the UI element it targets. Keeping it single-origin with `flow.md` means the demo can never diverge from the flow: its steps map one-to-one to the flow's paths, and the player never invents, skips, or reorders a step. A presentation layer may tune how the cursor moves and how long it pauses, because pacing is presentation, not behavior — but it may not change the sequence, because the sequence is the flow.

The format is symmetric because the same graph read backwards is a recording. Playing turns a graph into motion; recording turns motion into a graph. That symmetry is what makes the far-future support tool possible: a real user's session, captured, becomes the same kind of chart a designer authored — one a support person can read and replay.

## Why the phasing is explicit

The vision spans from a static doctrine to a live-session support tool, and building it all at once would mean designing the hardest parts (driving a live container, logging real user actions) before the foundation exists. The phasing names what is governed now (p1) and what is deferred, so the standard does not pretend the player or the recorder exist yet. p4's action logging is called out specifically because logging what real users do is a privacy and consent problem under the permission-gated world — a thing to design deliberately when it arrives, never to bolt on.

Last updated: 2026-07-25T15:22:50Z


## Overview (migrated from LABS.md)

# LABS

> Scope: the /labs visual sandbox — a flow-backed surface set where UI/UX is SEEN and refined before product UI is locked, plus the tiered discipline, the feedback protocol, and the extended-Mermaid auto-play walkthrough. Siblings: FLOW_CONTRACT.md (flows + labs_realization), USER_JOURNEYS.md (journeys), DESIGN_TOKENS.md + STATE_VOCABULARY.md (adopted at the Refine tier), MOBILE_FIRST.md. ---------- what /labs is ----------

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
- `manifest`: each surface declares its flow/journey id(s) + tier in a labs manifest (labs.yaml or front-matter) — flow ids reference existing flows/<fn>.flow.md
- `index`: docs/labs/00-INDEX.md maps every surface -> flow(s) and every flow -> surface(s)
- `index_terminal_lines`: ["unbacked_surfaces: 0", "uncovered_flows: 0"] _(both MUST be 0)_
- `enforced_by`: scripts/verify/verify-outside-in.mjs --check labs

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
- `gate`: promotion (explore->refine) AND feeding product are BLOCKED while any triage:flow item is
  - `status`: open — enforced by verify-labs.mjs
- `enforced_by`: scripts/verify/verify-outside-in.mjs --check labs

## auto_walkthrough

- `player`: an in-app JS/React library — client-side only, runs on ANY browser AND on mobile, no Playwright/Puppeteer runner required. It is a VISUAL DEMO, never an E2E assertion.
- `drives`: the real interactive labs DOM via data-testid / data-agent-action selectors — moves a simulated cursor, clicks real elements, fills fields, selects options; the UI genuinely transitions
- `format`: extended_Mermaid — the flow's Mermaid path graph EXTENDED so each node/edge carries a binding map of event, sequence, action, and a ui_binding (a selector or surface-state)
- `single_origin`: the extended-Mermaid stays reconciled to flows/<fn>.flow.md — its steps map 1:1 to the flow's paths; the player NEVER invents, skips, or reorders a step (a presentation layer may tune cursor motion / timing / pauses, but not the step sequence)
- `symmetric`: the library reads the format two directions — PLAY (author -> animate) now; RECORD (capture a real user's actions -> emit the same extended-Mermaid -> replay) is phase p4
- `trigger`: /labs lists the flows; picking one animates that flow on its surface

## phasing

- `p1`: the labs doctrine — flow-backed surfaces (bidirectional), Explore/Refine tiers, feedback protocol, mobile/PWA-first + full real estate. This standard governs p1.
- `p2`: the flow-player library + extended-Mermaid binding; auto-play on labs
- `p3`: the player drives a live site running in a test container, for real E2E visualization
- `p4`: record real user sessions -> extended-Mermaid -> support replay ("session as flow chart"); its action logging touches privacy / PII / consent (RULE 0 world) — designed at that phase, not before

## enforced_by

scripts/verify/verify-outside-in.mjs --check labs _(placement-aware; green when labs is not enabled for a repo)_

Last updated: 2026-07-25T15:22:50Z
