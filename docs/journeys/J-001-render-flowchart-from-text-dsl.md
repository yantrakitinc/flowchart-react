---
id: J-001
slug: render-flowchart-from-text-dsl
persona: >
  Product engineer at a B2B SaaS startup building a "workflow visualizer" feature into an
  existing React app; has never used this library but is comfortable with Mermaid's
  text-diagram convention from GitHub READMEs and Notion docs.
intent: >
  Author a diagram using a compact text/DSL description and have it render as a flowchart
  without hand-placing any node.
trigger: >
  A PM asks for an onboarding-funnel diagram inside the product; the developer recalls
  Mermaid's ```mermaid code-block convention and expects an equivalent text-first path here.
steps:
  - Find the package's quick-start docs to learn whether a text/DSL authoring mode exists.
  - Write a short text description of nodes and arrows (e.g. "Start --> Review --> Approve --> Done")
    mirroring Mermaid's arrow syntax.
  - Pass that text into the component/hook as the diagram source.
  - Render the component inside an existing React page.
  - Visually confirm nodes appear in a readable default layout, connected in the described order.
  - Add a branch (e.g. a "Reject" path) to the text and re-render to confirm the diagram updates.
success: >
  The flowchart renders matching the described node/edge structure with no manual x/y
  positioning, and edits to the text are reflected on the next render.
failure_outcomes:
  - when: The text uses a syntax the parser doesn't recognize (wrong arrow token, unclosed
      group/subgraph).
    explanation: >
      The parser returns a specific error identifying the offending line/token and the
      expected syntax, rather than rendering a blank canvas.
    alternative: Developer fixes the offending line per the message and re-renders (same journey, retry).
  - when: A node label contains characters that collide with DSL delimiters (quotes, colons, arrows).
    explanation: The error names the character and where quoting/escaping is required.
    alternative: Developer quotes the label and retries.
  - when: The developer requests a shape/keyword the DSL doesn't support.
    explanation: An unsupported-feature message names the fallback default shape actually used.
    alternative: Developer accepts the fallback or switches to structured-data authoring (J-002).
  - when: Two node identifiers collide (same id, different labels).
    explanation: A conflict message names both definitions and states which one wins.
    alternative: Developer renames one id and retries.
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "Mermaid.js text-first flowchart syntax and its ```mermaid fenced-code convention used across GitHub/Notion/docs sites"
    - "Mermaid parse-error UX (github.com/mermaid-js/mermaid issues #937, #4645) which names the offending token/line"
  not_derived_from_our_flows: true
maps_to_flows:
  - "src/parse/__specs__/flows/parse-flowchart.flow.md"
  - "src/react/__specs__/flows/render-flowchart.flow.md"
  - "src/react/__specs__/flows/flow-chart.flow.md"
---

# J-001: Render a flowchart from a text description (diagram-as-code)
