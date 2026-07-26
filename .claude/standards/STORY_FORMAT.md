# STORY_FORMAT

> ---------- story coverage ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## story_coverage

- `rule`: every user-rendered component (RSC or client) MUST have a story
- `exceptions`:
  - components built strictly for Storybook demo purposes
  - components that never render to a user
- `utilities`: get stories ONLY when a story clarifies usage
- `storybook_first`: a component's story is written and reviewed BEFORE the component is used in a page

## story_file

- `location`: ComponentName/__stories__/Component.stories.tsx
- `required_meta_config`:
  - tags: ['autodocs'] _(MANDATORY — turns on the Docs view (autodocs prop table))_
  - title: ui/ComponentName _(canonical sidebar path)_
  - component: ComponentName _(the imported component reference for autodocs)_
- `required_stories`: 1:
    - `name`: Playground
    - `purpose`: the interactive surface — FULLY FUNCTIONAL Controls tab + Actions tab
    - `controls`: "EVERY meaningful prop is controllable via argTypes — nothing important omitted. Object/array (JSON) props MUST use the `object` control; enums → select/radio; booleans → boolean; numbers → number/range. A prop with no usable control is non-compliant."
    - `actions`: "EVERY callback/event prop is wired with action('<name>') from 'storybook/actions'. NEVER fn() from storybook/test (a test util, not an action logger)."
    - `shape`: single Story with full args matching defaults + complete argTypes
  - `optional_second_story`:
    - `name`: AllVariants
    - `when`: the component has 2+ variant axes OR distinct states/slots worth showing in a grid
    - `shape`:
      single Story whose render() is a labelled grid covering EVERY meaningful surface:
        - every variant × color × size cell (cartesian product)
        - every state row (loading, disabled, fullWidth, invalid, selected, pressed — whatever the component supports)
        - every slot row (startIcon, endIcon, icon-only, leadingIcon, trailingIcon)
        - every named pattern from the component's V2 use cases (e.g. Scan CTA, BETA pill, SOON badge)
      Sections grouped by uppercase tracking-wide headings (e.g. "variant × color × size", "states", "slots", "v2 named patterns").
    - `purpose`: comprehensive one-page showcase — AllVariants covers every meaningful surface; standalone per-variant stories are forbidden (see cap)
    - `anti_pattern`: "AllVariants is NOT a 3-cell preview. If the source primitive supports loading, disabled, icons, or any slot — those MUST be shown in AllVariants, or the story is incomplete."
  - `required_third_story`:
    - `name`: Changelog
    - `required`: true
    - `rule`:
      Component history lives HERE — NOT in JSDoc, inline comments, or spec.md. A single
      Story whose render() lists changes newest-first: one row per change, version/date +
      one-line description. A brand-new component ships a single "v1 — initial" row.
    - `shape`:
      // Inline render — NO dependency on a shared changelog component (would be circular).
      // newest-first list of { version, date, change }.
      export const Changelog: Story = {
        parameters: { controls: { disable: true } },
        render: () => (
          <dl>
            <dt>1.1.0 — 2026-06-13</dt><dd>added size="small"</dd>
            <dt>1.0.0 — 2026-06-01</dt><dd>initial</dd>
          </dl>
        ),
      };
    - `template`: ~/.claude/standards/templates/changelog.story.tsx.template
  - `doc_entries`:
    - `see`:
      The Docs / README / Usage sidebar doc entries (all three required) are owned by
      COMPONENT_DOCS#doc-entries. The Verify-Manual story + the library-wide
      Verify-Manual » Master page are owned by VERIFY_MANUAL_STORIES.md.
  - `showcase`:
    - `name`: Showcase
    - `required`: false _(OPTIONAL — the ONLY home for any additional stories)_
    - `purpose`: composed examples / real-world usages / edge demos that don't belong in AllVariants; keeps extras out of the sidebar as separate top-level entries
  - `cap`:
    - `rule`:
      A component ships EXACTLY the seven required entries — Docs, README, Usage, Changelog, Verify-Manual,
      Playground, AllVariants — plus the OPTIONAL Showcase. No standalone per-variant / per-state /
      per-prop stories: those are rows inside AllVariants, or live under Showcase.
      (Docs / README / Usage entry contracts: COMPONENT_DOCS.md. Verify-Manual entry contract:
      VERIFY_MANUAL_STORIES.md.)
    - `forbidden`:
      - stories named after one variant/state/prop ('Outlined', 'Sizes', 'Loading', 'Disabled', 'WithStartIcon')
      - any sidebar entry beyond the seven required + the optional Showcase
    - `master_entry`: "ONE extra top-level entry exists library-wide: `verify-manual--master` (see VERIFY_MANUAL_STORIES#verify-manual-master). It is NOT a per-component story and does not count against any component's seven-entry cap."
- `callback_implementation`:
  Use `action()` from the core `storybook/actions` import path (Storybook 9+). NEVER use `fn()`
  from `storybook/test` — those are test utilities, not action loggers.
  Example: `import { action } from "storybook/actions"; onClick: action("onClick")`.

Last updated: 2026-07-12T00:00:00Z