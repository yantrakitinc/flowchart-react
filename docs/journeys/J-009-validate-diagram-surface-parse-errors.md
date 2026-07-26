---
id: J-009
slug: validate-diagram-surface-parse-errors
persona: >
  Developer building a "paste your workflow definition" import feature for end users of their
  own SaaS product, who must validate arbitrary user-submitted diagram content before rendering.
intent: >
  Run a diagram description through a validator/parser ahead of render, catching structural or
  syntax problems with actionable messages rather than a silent render failure or crash.
trigger: >
  End users will paste/import diagrams of unknown quality; the developer expects a "lint/validate"
  entry point similar to Mermaid's mermaid.parse() with structured error results.
steps:
  - Find a standalone validate/parse function (distinct from the render call) usable without
    mounting the diagram.
  - Feed candidate diagram text/data into the validator.
  - Inspect the returned result to distinguish "valid" from "invalid", reading structured error
    details (location, message, severity) for invalid input.
  - Surface those details in the developer's own import UI (inline error naming the line/node at fault).
  - Confirm a corrected version of the same input passes validation before attempting to render it.
success: >
  Invalid input is caught before render with a specific, actionable error (not a blank screen
  or uncaught exception), and valid input passes cleanly.
failure_outcomes:
  - when: The input has a syntax error (bad token, unclosed block).
    explanation: The error names the line/position and the expected token.
    alternative: Developer/user fixes the input at that location and re-validates.
  - when: The input is syntactically valid but semantically broken (edge to a nonexistent node).
    explanation: The error is distinguished from a syntax error and names the dangling reference.
    alternative: User fixes the reference and re-validates.
  - when: Input exceeds a supported size/complexity limit.
    explanation: The message states the limit and how far the input exceeds it.
    alternative: User splits the diagram or requests a higher-limit path.
  - when: Validate is called on empty/null input.
    explanation: The message distinguishes "nothing to validate yet" from an actual validation failure.
    alternative: Caller supplies content before invoking validate.
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "Mermaid's mermaid.parse()/suppressErrors validation entry point (mermaid-js/mermaid error-handling docs)"
    - "Mermaid parse-error issue threads showing the expected shape of an actionable syntax error (github.com/mermaid-js/mermaid/issues/937)"
  not_derived_from_our_flows: true
maps_to_flows: []
---

# J-009: Validate/parse a diagram and surface errors
