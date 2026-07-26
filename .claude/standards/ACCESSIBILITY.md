# ACCESSIBILITY

> ---------- the bar ----------

```meta
version: 1
last_updated: 2026-07-16T00:00:00Z
```

## wcag_bar

- `name`: WCAG 2.2 AA accessibility
- `applies_to`: every UI folder (components, pages)
- `test`: each interactive element keyboard-operable, screen-reader-labelled, contrast-passing
- `spec_declaration`: every spec.yaml declares how the feature handles this concern (or "n/a — <reason>") — declaration rule owned by SPEC_CONTRACT.md

## aria_pattern_required

- `rule`:
  every primitive's design references a real WAI-ARIA APG pattern URL
  (https://www.w3.org/WAI/ARIA/apg/patterns/<slug>/) OR an explicit "n/a — <reason>".
- `declared_in`: __specs__/design.md (design-phase completeness enforcement owned by COMPONENT_CREATION.md)

## test_runner

- `rule`: every primitive ships a passing `pnpm verify:stories` run before merge
- `scripts`: test:stories: "test-storybook --url http://localhost:41495 --maxWorkers=2  // requires SB already running" verify:stories: | start-server-and-test 'storybook dev -p 41495 --no-open --quiet' http://localhost:41495 'test-storybook --url http://localhost:41495 --maxWorkers=2'
- `config_file`: ".storybook/test-runner.ts"
- `behavior`:
  On each story (Playground + AllVariants), test-runner mounts the story in a real Chromium
  browser, injects axe-core, and runs the WCAG 2.0 A + 2.0 AA + 2.2 AA rule set. Failing rules
  throw with the offending element's target selector, html, and failureSummary.
- `preview_wiring`: "`parameters.a11y.test: \"off\"` in preview.ts — the addon panel audits, the test-runner gates; wiring owned by STORYBOOK_SETUP#storybook-config-required"
- `documented_exceptions`:
  - `rule`:
    Brand decisions that intentionally fall below WCAG-AA are opt-in via the
    `data-axe-exception="<name>"` attribute. The test-runner config maps each attribute value
    to ONE disabled axe rule; every other rule still runs on the excepted subtree. Every
    exception is grep-able by searching `data-axe-exception=` across source.
  - `schema`:
    - `"data-axe-exception=<name>"`:
      - `disabled_rule`: "<axe rule id>"
      - `rationale`: "<one-paragraph design call>"
  - `initial_exceptions`:
    - `"v2-severity-saturated"`:
      - `disabled_rule`: "color-contrast"
      - `rationale`:
        V2 brand ships saturated severity colors (#ef4444 critical/destructive, #f97316
        serious, #f59e0b amber CTA) that fall below WCAG AA-normal (4.5:1) at small text.
        Brand decision — load-bearing for "scan glance" recognition across the extension.
    - `"v2-small-target"`:
      - `disabled_rule`: "target-size"
      - `rationale`:
        Checkbox size="small" ships at 14px to fit dense scan-config rows. Use ONLY when
        row spacing physically guarantees ≥ 24px between adjacent targets.
- `enforcement`:
  `pnpm verify:stories` is part of `pnpm verify`; a failing run = failing verify chain — no
  merge. Status: `locked` requires a green test-runner run AT THE TIME of locking, recorded
  in standards-compliance.yaml (see LOCK_FILES.md).
- `wiring_gate`: scripts/verify/verify-accessibility-wiring.mjs _(refuses a Storybook UI repo that does not wire verify:stories + test-runner.ts into pnpm verify)_

Last updated: 2026-07-16T00:00:00Z