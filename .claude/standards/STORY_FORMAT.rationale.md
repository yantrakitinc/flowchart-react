# STORY_FORMAT — detail

Why each rule in `STORY_FORMAT.md` exists.

## Why this standard exists at all

Every component must have its props + variants exhausted in a Playground and its visual contract documented in stories. Without these, UI bugs ship silently — looking fine on the developer's screen, broken on every other.

## Story coverage

Every user-rendered component has a story. Three exceptions:

1. Components built strictly for Storybook demo purposes (themselves).
2. Components that never render to a user (debug-only helpers).
3. Utilities/functions, unless a story would genuinely clarify usage.

The Storybook-first rule (story BEFORE the component is used in a page) means the component's API is reviewed in isolation before it gets integrated. Bugs caught at the story stage cost a fraction of bugs caught after integration.

## Story file format

- **Playground** — every prop exposed via `argTypes`. Reviewers exercise the full prop surface. `action('callbackName')` captures callback invocations so the reviewer can verify event wiring.
- **AllVariants** — every variant × color × size side-by-side. Visual matrix for regression review, with state rows and slot rows so no meaningful surface goes unrendered.
- **Changelog** — the component's history, browsable in the sidebar.

`action()` from `storybook/actions` is preferred over `fn()` from `storybook/test`. Reasons:

1. `action()` produces a readable log in the Actions panel.
2. `fn()` is a Vitest mock; in Storybook it pollutes the inspector with mock metadata.
3. `action()` is the Storybook-native way; `fn()` is testing reuse leaking into docs.

## Changelog story — why history lives in Storybook

Parent-facing JSDoc answers "how do I call this?"; the Changelog story answers "how did this evolve?". Separating them keeps JSDoc + inline comments minimal (per `CODE_DOCUMENTATION.md`) while preserving history in a browsable, grep-free place.

## Six-entry sidebar cap — rationale

Each concern has its proper home: Docs (autodocs prop table + stories) · Usage (curated examples) · Changelog (history) · Verify-Manual (spec-derived TEST INSTRUCTIONS — no render, no form) · Playground (the live component you operate — controls + actions) · AllVariants (visual scan) · Showcase (anything else, incl. states Playground can't reach). The verdict form lives once on the Verify-Manual » Master page (`VERIFY_MANUAL_STORIES#verify-manual-master`). The sidebar lists COMPONENTS + these views, not prop combinations — every per-variant/per-state/per-prop concern is a row inside AllVariants, so the sidebar never fills with standalone variant stories.

Last updated: 2026-07-12T00:00:00Z
