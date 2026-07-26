# COMPONENT_DOCS — detail

Why each rule in `COMPONENT_DOCS.md` exists.

## Why this standard exists at all

A component without documentation ships half-done: the prop table teaches nothing, and the next developer reverse-engineers usage from call sites. Three doc surfaces cover the three questions a consumer asks: Docs (what are the props — auto-generated), README (what IS this component), Usage (how do I wire it).

## README vs Usage — why two separate MDX entries

README answers "what is this component and when do I pick it over its siblings" — the identity document. Usage answers "how do I wire it" — realistic, copy-pasteable patterns a new developer copies from directly. Collapsing them produces either an identity page bloated with code blocks or a how-to page whose opening never says what the thing is. Both are required; neither replaces the other.

## Why Usage previews reference stories by id

The `<Story id="…" />` tag renders the SAME registered story the autodocs view renders — one component-under-test, two views. Inline JSX in MDX would create a second, unregistered render that can silently drift from the real story set.

## The docsView global

Storybook surfaces the same primitive in two views via the `docsView` global: `docsView:docs` (autodocs prop table + every story inline) and `docsView:usage` (the curated how-to). Both share the same story set, so nothing renders in one view that isn't verifiable in the other. The preview wiring for the global is owned by `STORYBOOK_SETUP#storybook-config-required`.

## JSDoc on props — why required

Storybook's autodocs reads JSDoc to populate the prop table's Description column; without JSDoc the Docs view shows "—" for every prop description. Parent-facing descriptions (how to call it, not a changelog) keep the prop table readable and push history to the Changelog story where it belongs (`STORY_FORMAT#story-file`).

Last updated: 2026-07-12T00:00:00Z
