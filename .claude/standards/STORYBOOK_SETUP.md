# STORYBOOK_SETUP

> ---------- Storybook requirement + hosting ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## storybook

- `required`: every project (ask first for tiny projects with < ~15 components)
- `hosting`:
  - `rule`: deploy as subpath of project domain
  - `path`: <project-domain>/storybook/
  - `banned`: gh-pages

## required_addons

- `"@storybook/addon-a11y"`:
  - `mode`: error _(fail on accessibility violations, not just warn)_
- `"@storybook/addon-controls"`: {}
- `"@storybook/addon-viewport"`:
  - `presets`: [320, 375, 768, 1024, 1440] _(mobile / phablet / tablet / laptop / desktop)_

## storybook_config_required

- `main_ts`:
  - "stories glob MUST include __stories__/*.stories.@(ts|tsx) AND __stories__/*.readme.mdx AND __stories__/*.usage.mdx"
  - "framework: @storybook/react-vite (or project equivalent)"
  - "addons: ['@storybook/addon-a11y', '@storybook/addon-docs']  // a11y + docs addons mandatory"
- `preview_ts`:
  - `a11y_parameter`:
    - `rule`:
      `parameters.a11y.test` MUST be set to `"off"`. The pass/fail axe gate lives in
      `.storybook/test-runner.ts` — see ACCESSIBILITY#test-runner — NOT in the
      addon-a11y auto-test; only the test-runner config understands the
      `data-axe-exception` opt-in attribute (ACCESSIBILITY#test-runner).
    - `shape`: 'parameters: { a11y: { test: "off" } }'
    - `effect`: addon-a11y's panel stays visible inside Storybook for manual auditing; the gate is the test-runner
  - `docs_view_global`:
    - `rule`:
      preview wiring carries the `docsView` global (values docs | usage) that switches each
      primitive between its two doc views. View contract + section requirements are owned by
      COMPONENT_DOCS#usage-mdx.

Last updated: 2026-07-12T00:00:00Z