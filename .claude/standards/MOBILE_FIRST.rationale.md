# MOBILE_FIRST — detail

Why each rule in `MOBILE_FIRST.md` exists.

## Why this standard exists at all

Designing from the small viewport up is cheaper than retrofitting. Mobile responsiveness is a property that can't be added later — it has to be designed in from day one or it never arrives; bolting it on after shipping costs 10× and never reaches parity.

A spec that says "renders on mobile" is making a claim that has to be tested. A spec that says nothing about mobile means the feature will eventually ship broken on phones — which is why every spec.md declares its handling of the concern (`SPEC_CONTRACT.md`), and why Storybook's viewport presets start at 320px so every component gets small-first review without manual resizing.

Last updated: 2026-07-12T00:00:00Z
