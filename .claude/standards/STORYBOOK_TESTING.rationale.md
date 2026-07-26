# STORYBOOK_TESTING — detail

Why each rule in `STORYBOOK_TESTING.md` exists.

## Intent

A component that ships stories is verified from the story surface as well as from unit tests — and the markup/CSS markers those verifications rely on must be real on both ends. Story shapes themselves (Playground / AllVariants / Changelog) are `STORY_FORMAT.md`; test IDs come from `TEST_NAMING.md`.

## Storybook component testing — two-way coverage

A component that ships stories is verified two ways. Its **Playground** story exposes every prop as a control in the sidebar, **except function props**, which are wired to the **actions** panel — so an agent confirms the callback fires with the right args, and every prop value + every callback is reachable and observable from the story alone. Then **every control and every scenario** is checkable both by a **unit test** and by the **Claude Code Chrome Extension** operating the Playground story (set control / trigger action / read result). Cases follow `TEST_NAMING` (`unit:<feature-path>/<Component>/<case>`).

## No orphan markers — bidirectional

Every `data-testid` / `data-agent-action` / `data-agent-step` / `aria-label` on an element must be referenced by ≥ 1 test or `__specs__/manual/<flow>.md`. Every test selector must point at a marker on a real element.

Banned:
- `data-testid` added but never tested — silent dead code in markup.
- Test selector for a marker no element carries — selector returns nothing, assertions on nothing pass vacuously.
- State CSS class with no element carrying it — dead CSS.

No central `docs/test-matrix/marker-audit.md` register. Cross-feature collision checks use grep; the per-feature spec.yaml documents the markers each feature owns.

## Computed-style verification

`classList.contains("active")` proves the class was added. It does NOT prove a CSS rule responded to it. The user-perceivable state change might not have happened.

`getComputedStyle(el).<prop>` reads the actual rendered value. Or screenshot regression compares pixels.

Use computed-style or screenshot for any state change a user is supposed to perceive. Plain `classList.contains` alone is theater.

## Exemption

Paths inside a `.archive/` folder are exempt (see STANDARDS_ENTRY).

Last updated: 2026-07-12T00:00:00Z
