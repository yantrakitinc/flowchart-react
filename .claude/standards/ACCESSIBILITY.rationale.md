# ACCESSIBILITY — detail

Why each rule in `ACCESSIBILITY.md` exists.

## Why WCAG 2.2 AA is the bar

WCAG 2.2 AA is the legal floor in most jurisdictions (US Section 508, EU EN 301 549, ADA case law). It also opens the surface to the agent population — keyboard-operable + screen-reader-labelled UI is what a Chrome-extension agent can drive. A WCAG-compliant UI is an agent-compliant UI.

Accessibility is a property that can't be added later — it has to be designed in from day one or it never arrives. Bolting it on after shipping costs 10× and never reaches parity, which is why every spec declares its handling of the concern at design time (`SPEC_CONTRACT.md`).

## Why an APG pattern reference is required

WAI-ARIA Authoring Practices Guide patterns are the primary source for keyboard maps, roles, and states of interactive widgets. Requiring a real APG URL (or an explicit, auditable "n/a — <reason>") in each primitive's design keeps ARIA behavior derived from the canonical pattern, not invented per component.

## Why the gate is the test-runner, not the addon

The addon-a11y panel is an audit surface; the pass/fail gate lives in `.storybook/test-runner.ts` because only the test-runner config understands the `data-axe-exception` opt-in attribute. The test-runner mounts each story in a real Chromium browser and runs axe-core with the WCAG 2.0 A + 2.0 AA + 2.2 AA rule set — a real-browser check, not a JSDOM approximation.

## Documented axe exceptions — why opt-in per subtree

An exception is a named, grep-able design decision, not a global rule disable: each `data-axe-exception` value maps to exactly ONE disabled axe rule, and every other rule still runs on the excepted subtree.

The `v2-small-target` waiver exists because spacing around the small checkbox varies per consumer; rather than force every consumer to pad the 14px checkbox to a 24×24 target, the brand opts the small checkbox into the documented exception — valid only where row spacing physically guarantees the ≥ 24px separation between adjacent targets.

Last updated: 2026-07-12T00:00:00Z
