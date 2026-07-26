# CROSS_CUTTING_CONCERNS — detail

Why each rule in `CROSS_CUTTING_CONCERNS.yaml` exists.

## Why this standard exists at all

Four properties of a system can't be added later — they have to be designed in from day one or they never arrive: accessibility, server-side authorization scoping, mobile responsiveness, and internationalization. Pile on a feature without these, and bolting them on later costs 10× and never reaches parity.

So every spec must declare how the feature handles each concern. The declaration forces the spec author to think about the property at design time, not at "production support" time when it's already shipping bugs.

## Why these four specifically

- **WCAG 2.2 AA accessibility** — legal floor in most jurisdictions (US Section 508, EU EN 301 549, ADA case law). Also opens the surface to the agent population — keyboard-operable + screen-reader-labelled UI is what a Chrome-extension agent can drive. A WCAG-compliant UI is an agent-compliant UI.

- **Server-side auth + authorization-scoped data** — every response the server emits must be filtered to what the caller is authorized to see. Client-side filtering is a leak waiting to happen. The concern in the spec records the rule for THIS feature: "what does the server filter, by what principal context?"

- **Mobile-first** — designing from small viewport up is cheaper than retrofitting. A spec that says "renders on mobile" is making a claim that has to be tested. A spec that says nothing about mobile means the feature will eventually ship broken on phones.

- **i18n** — hardcoded strings are debt. Every user-facing label that ships untranslatable is a future migration's worth of work. Capturing "this feature routes all labels through the i18n layer" at spec time prevents the bug class entirely.

## Why declared in `spec.yaml.cross_cutting`

The cross-cutting block lives inside the per-folder `spec.yaml` because the answer to "how does this feature handle WCAG?" depends on the feature. A pure-API folder's WCAG answer is "n/a — no UI surface". A login page's WCAG answer is "every input keyboard-reachable, focus order matches reading order, error messages live-announce." Generic "we follow WCAG" boilerplate is useless; the per-folder declaration forces specificity.

The `n/a — <reason>` shape is allowed precisely because forcing every folder to invent WCAG content when there's no UI is theatre. The reason field exists to make the "n/a" auditable — the reviewer can see whether the author thought about it.

## Why no separate "verify-cross-cutting-in-spec" gate

A keyword grep over spec.md produces both false positives (a spec mentioning "auth" in a comment passes) and false negatives (a careful author using synonyms gets flagged). It can't answer the real question — does the declared handling match what the code actually does.

The manual walk at lock time IS the verification. The walker reads `spec.yaml.cross_cutting:` and checks: are all four declared? Does the declared handling match what the code actually does? Only a human walk can answer the second question.

Last updated: 2026-05-20T04:06:03Z
