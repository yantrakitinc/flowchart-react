---
id: J-007
slug: theme-diagram-to-app-design-tokens
persona: >
  Design-systems engineer at a company with an existing Tailwind/CSS-variable design system,
  integrating the diagram into a themed dashboard with a light/dark mode toggle.
intent: >
  Make the diagram's colors/fonts/spacing pull from the app's own design tokens (CSS variables)
  instead of the library's default look, including responding to the app's dark-mode toggle.
trigger: >
  The diagram looks visually inconsistent against the rest of the themed app; the developer
  expects a CSS-variable override mechanism the way React Flow's colorMode + CSS variables work.
steps:
  - Find documentation on how the diagram's visual tokens (background, node fill/border, edge
    stroke, text) are exposed for overriding.
  - Map the app's existing CSS variables/design tokens onto the library's expected variable
    names or theme prop.
  - Wire the app's light/dark mode state into the diagram's color-mode prop or wrapper class.
  - Render in both light and dark states and confirm the diagram matches the app's palette in both.
  - Confirm the diagram continues to update automatically if the app's tokens change, without
    per-node style edits.
success: >
  The diagram's colors/fonts derive from the app's own token set, and toggling the app's
  light/dark mode also updates the diagram to match, with no hardcoded hex overrides.
failure_outcomes:
  - when: The app's tokens don't cover every visual seam the library needs (e.g. no dedicated
      "edge stroke" token).
    explanation: >
      Docs/message enumerate the exact variable names the library reads, so the gap is visible
      rather than a silently unstyled element.
    alternative: Developer adds the missing token, or accepts the library default for that seam.
  - when: An app CSS variable is defined too low in the DOM tree to cascade to the diagram wrapper.
    explanation: >
      Nothing errors, but the mismatch is diagnosable by comparing computed values against the
      library's documented variable names.
    alternative: Developer moves the token definition to a shared ancestor and retries.
  - when: An invalid CSS variable value is set (non-color).
    explanation: >
      Rendering falls back to the library default and, where feasible, a console warning names
      the bad variable.
    alternative: Developer fixes the value and retries.
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "React Flow's colorMode prop + CSS-variable theming (reactflow.dev/learn/customization/theming, /examples/styling/dark-mode)"
    - "General design-token/CSS-variable dark-mode conventions (single-selector theme flip)"
  not_derived_from_our_flows: true
maps_to_flows: []
---

# J-007: Theme the diagram to match an app's design tokens
