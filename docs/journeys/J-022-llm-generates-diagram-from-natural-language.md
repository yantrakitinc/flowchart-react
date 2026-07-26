---
id: J-022
slug: llm-generates-diagram-from-natural-language
persona: >
  An LLM-backed product feature ("describe your process in plain English and we'll draw it")
  that must turn a free-text user description into a diagram.
intent: >
  Have the LLM produce structured tool-call/JSON output describing nodes and transitions from a
  natural-language process description, then feed that structured output into the diagram
  library to render, handling gracefully when the LLM's output doesn't match the expected shape.
trigger: >
  A user types "when an order comes in, check inventory, if in stock ship it, otherwise notify
  the customer and cancel" and expects a rendered flowchart back.
steps:
  - Design a structured-output schema (tool-call/function-call JSON shape) for "nodes" and
    "edges" that the LLM is instructed to fill from the natural-language description.
  - Invoke the LLM with that schema as its structured-output contract, rather than asking it
    to emit the diagram library's raw DSL text directly.
  - Validate the LLM's returned JSON against the diagram library's expected node/edge schema
    (reusing the validate step from J-009) before rendering.
  - Feed the validated structure into the diagram component to render.
  - If validation fails, feed the specific validation error back to the LLM as a repair
    instruction and retry once or twice before giving up.
  - Render the final diagram and let the user visually confirm it matches their described process.
success: >
  A natural-language process description is turned into a correctly-structured, renderable
  diagram, with LLM output validated (and self-repaired on a fixable mismatch) rather than
  rendered blindly.
failure_outcomes:
  - when: The LLM's output doesn't match the expected schema (e.g. missing required edge fields).
    explanation: The same structured validation error from J-009 is surfaced, naming the exact missing/invalid field.
    alternative: The specific error is fed back to the LLM as a repair prompt and retried (bounded retry count).
  - when: The LLM invents a node type/shape keyword the diagram library doesn't support.
    explanation: Validation names the unsupported value and the render falls back to a default rather than silently guessing.
    alternative: The LLM is re-prompted with the supported-value list, or the app maps the invented keyword to the closest supported one.
  - when: Repair retries are exhausted and the LLM still can't produce valid structured output.
    explanation: The user is told automatic diagramming failed for this description, with the offending part named if identifiable.
    alternative: User is offered the manual structured-data or text-DSL authoring path (J-001/J-002) as a fallback.
  - when: The natural-language description is too ambiguous to map to a deterministic flow
      (no clear sequential steps).
    explanation: The LLM/app tells the user the description needs clearer steps/conditions.
    alternative: User rephrases with clearer sequential/conditional language and retries.
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "JSON-first LLM diagramming pattern - have the model emit structured JSON, then convert to diagram syntax programmatically, rather than asking it to emit fragile DSL text directly (smcleod.net, matt-adams.co.uk structured-data-generation writeups)"
    - "LangChain StructuredOutputParser + Zod schema pattern for constraining LLM diagram output"
  not_derived_from_our_flows: true
maps_to_flows:
  - "src/parse/__specs__/flows/parse-flowchart.flow.md"
---

# J-022: An LLM/agent generates a diagram from a natural-language description
