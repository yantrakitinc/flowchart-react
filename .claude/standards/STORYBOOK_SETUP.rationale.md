# STORYBOOK_SETUP — detail

Why each rule in `STORYBOOK_SETUP.md` exists.

## Why this standard exists at all

Storybook is the visual review system. UI components are the part of the codebase humans actually see — a bug in a service function shows up in a log; a bug in a button shows up in front of every user. Storybook is required on every project because:

1. It's where the AllVariants matrix lives — a single page that shows every combination of variant × color × size. A visual regression eyeball at this matrix catches CSS bugs that pixel-tests miss.
2. It's where the agent-driven walkthroughs start (`__specs__/manual/<flow>.md` with `Start: <storybook-url>`).
3. It's the surface a designer reviews without running the app.

The `< ~15 components` ask-first carve-out exists for small projects where Storybook is more overhead than benefit. Anything bigger should have Storybook from day one.

## Hosting as a subpath

Deploy as subpath of the project's own domain. Hosting on `<project-domain>/storybook/` keeps the analytics, auth, CSP, and styling unified with the main app. gh-pages adds a separate subdomain that splits the story.

## Required addons

The addons cover the minimum:

1. **`addon-a11y` in error mode** — accessibility violations FAIL the story. WCAG 2.2 AA is the bar (`ACCESSIBILITY#wcag-bar`); addon-a11y surfaces it at story time, while the pass/fail gate itself is the test-runner (`ACCESSIBILITY#test-runner`).
2. **`addon-controls`** — interactive prop manipulation in the Playground story.
3. **`addon-viewport`** with 5 presets (320 / 375 / 768 / 1024 / 1440) — mobile-first review on every component without manual resize (the design bar itself is `MOBILE_FIRST.md`).
4. **Actions** — callback invocations are captured for inspection via `action()` from the core `storybook/actions` import path; no separate actions package exists.

## Why `parameters.a11y.test` is "off" in preview.ts

The addon-a11y auto-test cannot honor the `data-axe-exception` opt-in attribute; only the `.storybook/test-runner.ts` config maps each exception name to its single disabled axe rule. Turning the addon's auto-test off keeps exactly ONE pass/fail gate (the test-runner) while the addon's panel stays available for manual auditing inside the Storybook UI.

Last updated: 2026-07-12T00:00:00Z
