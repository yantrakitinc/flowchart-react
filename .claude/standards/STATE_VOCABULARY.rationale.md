# STATE_VOCABULARY — detail

Why each rule in `STATE_VOCABULARY.md` exists.

## Why this standard exists at all

Interaction states (hover, focus, active, disabled, loading) are where component libraries rot fastest: each new component invents its own hover treatment, and six months in the library carries eleven different hover behaviors that all read as "inconsistent" to a user. Binding every interactive state to a shared `state-*` utility class makes the treatment a vocabulary — defined once in `states.css`, consumed everywhere — instead of a per-component improvisation.

## Why direct Tailwind state variants are banned in component source

A `hover:bg-…` written inline in a component is an unauditable one-off: no verifier can tell whether it matches the library's hover treatment, and no theme swap can restyle it centrally. Routing every state through the shared classes means the vocabulary file is the single place interaction treatments are defined, and `verify-component-state-vocab.mjs` can mechanically refuse inventions.

## Why cross-variant consistency is enforced

Within one cva `variant` group, all entries must share the same state-class binding. If `default` hovers with `state-hover-contained` while `destructive` hovers with an opacity trick, the two variants feel like different components. The verifier greps cva variant groups and refuses any group whose entries disagree on a state prefix.

## Hover vocabulary — why shape decides the class

WCAG 1.4.11 makes underline the hover affordance for link-shaped text — so the `state-hover-text*` classes add `text-decoration: underline`. That affordance is wrong for anything button-shaped or icon-shaped: underlining a Tabs trigger or a close × reads as a rendering bug. The map pairs each trigger SHAPE with its correct affordance.

The `state-hover-soft` / `state-hover-contained` split exists because `filter:brightness` — the contained hover — is mathematically invisible on a transparent background (the filter has nothing to darken). Borderless ghost triggers (Toggle, inactive Tabs, Accordion) need an explicit background tint or they appear non-interactive.

The verifier checks binding consistency, not shape semantics — shape is caller judgment, with the heuristic: a trigger bigger than a single line of text is NOT an inline link.

Last updated: 2026-07-12T00:00:00Z
