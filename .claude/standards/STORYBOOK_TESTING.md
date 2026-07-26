# STORYBOOK_TESTING

> Rationale for every rule: STORYBOOK_TESTING.rationale.md. Story format (Playground/AllVariants/Changelog shapes): STORY_FORMAT.md. Test IDs: TEST_NAMING.md. Unit-coverage bar the two-way rule pairs with: UNIT_COVERAGE#coverage. ---------- storybook component testing (two-way coverage) ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## storybook_component_testing

- `applies_when`: a feature ships a UI component with stories
- `playground_story`:
  - `rule`: every prop is a control in the Storybook controls sidebar — EXCEPT function props
  - `function_props`: wired to the Storybook `actions` panel (so an agent confirms the callback fires with the right args)
  - `consequence`: every prop value + every callback is reachable and observable from the story alone
- `two_way_coverage`:
  - `rule`: every control AND every scenario a component supports is verifiable BOTH ways
  - `way_1`: a unit test
  - `way_2`: the Claude Code Chrome Extension operating the Playground story (set control / trigger action / read result)
- `ids`: component cases follow TEST_NAMING (unit:<feature-path>/<Component>/<case>)

## no_orphan_markers

- `applies_to`: data-testid / data-agent-action / data-agent-step / aria-label / state CSS classes
- `rule`:
  - every marker on an element MUST be referenced by ≥ 1 test / selector / __specs__/manual/<flow>.md script
  - every test / selector MUST point at a marker on a real element
- `banned`:
  - data-testid added but never tested
  - test selector for a marker no element carries
  - state CSS class with no element carrying it
- `audit_location`: per-feature __specs__/spec.md documents markers; cross-feature registers via grep (no central marker-audit.md)

## computed_style

- `rule`: state changes a user is supposed to PERCEIVE are verified via getComputedStyle OR screenshot regression
- `banned`: classList.contains("active") alone (proves class was added; not that CSS responded)
- `example`:
  // BANNED:
  expect(el.classList.contains("active")).toBe(true);
  // REQUIRED:
  expect(window.getComputedStyle(el).backgroundColor).toBe("rgb(255, 0, 0)");

Last updated: 2026-07-12T00:00:00Z