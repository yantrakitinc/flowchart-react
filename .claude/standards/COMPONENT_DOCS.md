# COMPONENT_DOCS

> ---------- required doc entries in the sidebar ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## doc_entries

- `docs`:
  - `name`: Docs
  - `required`: true
  - `source`: "tags:['autodocs'] — the autodocs Docs view (meta config owned by STORY_FORMAT#story-file)"
  - `purpose`: "the auto-generated reference: prop table + every story rendered inline"
- `readme`:
  - `name`: README
  - `required`: true
  - `source`: "__stories__/<ComponentName>.readme.mdx (see readme_mdx below — 3 required elements)"
  - `purpose`: "WHAT the component IS — opens with the **What it is** explainer so no component ships half-documented"
  - `distinct_from`: "Usage — README and Usage are TWO separate doc entries; both required; neither replaces the other"
- `usage`:
  - `name`: Usage
  - `required`: true
  - `source`: "__stories__/<ComponentName>.usage.mdx (see usage_mdx below — Meta name + 8 sections)"
  - `purpose`: "curated, copy-pasteable how-to; surfaced via the docsView:usage global"
  - `distinct_from`: "README — README and Usage are TWO separate doc entries; both required; neither replaces the other"
- `sidebar_cap`: the six-entry sidebar cap these entries count against is owned by STORY_FORMAT#story-file

## readme_mdx

- `rule`: every primitive ships an MDX file at __stories__/<ComponentName>.readme.mdx alongside the .stories.tsx
- `purpose`:
  The component's README — answers WHAT THE COMPONENT IS and when to reach for it, so no
  component ships half-documented. DISTINCT from the Usage MDX: README answers "what is this";
  Usage answers "how do I wire it". Both are required; neither replaces the other.
- `required_elements`: 1: '<Meta … name="README">' 2: "# {ComponentName}" 3: "**What it is —** …"
- `scope_guidance`:
  Short. What the component is, what problem it solves, when to pick it over its siblings.
  How-to content (install, import, patterns, code blocks) belongs in the Usage MDX, not here.

## usage_mdx

- `rule`: every primitive ships an MDX file at __stories__/<ComponentName>.usage.mdx alongside the .stories.tsx
- `purpose`:
  Storybook surfaces the same primitive in TWO views via the `docsView` global:
    ?globals=docsView:docs   → autodocs (auto-generated prop table + every story rendered inline)
    ?globals=docsView:usage  → the usage MDX (how-to with code blocks per pattern)
  Both share the same story set. DISTINCT from the README MDX (readme_mdx above) — both are
  required; neither replaces the other.
- `required_meta`: '<Meta … name="Usage">' _(names the doc entry Usage in the sidebar — keeps it distinct from README)_
- `required_sections`: 1: "# {ComponentName} Usage" 2: "## Installation" 3: "## Import" 4: "## Basic Usage" 5: "## Props" 6: "## Examples"
  - `examples_subsection_shape`:
    - "### {Pattern Name}" _(e.g. "### Color Variants")_
    - "<one-line prose>" _(why this pattern; what problem it solves)_
    - "<code block>" _(copy-able snippet of just that pattern)_
    - "<Story id=\"<story-id>\" />" _(the live preview, referencing a focused story by id (NOT inline JSX))_ 7: "## Accessibility" 8: "## Design System Integration"
- `story_reference_format`:
  Every live preview MUST use Storybook's `<Story>` tag referencing a story id, not inline JSX —
  this guarantees the MDX renders the SAME component-under-test as the autodocs:
    <Story id="ui-button--playground" />
- `forbidden_patterns`:
  - inline JSX previews in MDX without backing stories — every preview must reference a Story
  - encyclopedic prose — keep each pattern's prose to 1-2 sentences max
  - duplicating the prop table inside the MDX — link to docsView:docs instead OR show a single typedef code block
  - manual prop tables — autodocs generates this automatically from JSDoc
- `scope_guidance`:
  Enough prose to teach, not encyclopedic. A pattern needing more than 3 sentences of
  explanation probably belongs as its own future composite primitive, not a usage example.

## jsdoc

- `rule`: every public prop on every primitive's iProps interface MUST carry a JSDoc comment
- `scope`:
  PARENT-FACING ONLY — the prop's meaning, default, and a usage example. NOT history, rationale,
  or internal mechanics: history → Changelog story (STORY_FORMAT#story-file);
  rationale → spec.md. One-line description + @default + (optional) @example.
  See CODE_DOCUMENTATION.md.
- `enforcement_location`: types.ts (where the interface lives)
- `shape`:
  /**
   * <one-line description of what the parent passes / what it controls>
   * @default <value or undefined>
   * @example
   *   <ComponentName propName="value" />
   */
  propName?: <type>;

Last updated: 2026-07-12T00:00:00Z