---
id: J-021
slug: typescript-strict-types-for-nodes-edges
persona: >
  Developer on a strict-mode TypeScript codebase (strict: true, no any) building a typed
  workflow editor, wanting full type safety across custom node data shapes.
intent: >
  Get compile-time type checking on node/edge data (e.g. a custom node's specific data fields)
  rather than working with loosely-typed `any` objects.
trigger: >
  The team's linter/CI rejects `any`, and a generic untyped node data object would fail their
  own type-safety bar, mirroring React Flow's exported generic Node<T>/Edge<T> types.
steps:
  - Check whether the library ships its own TypeScript types (bundled .d.ts, not requiring a
    separate @types/ package).
  - Find whether node/edge types are generic (parameterizable with the app's own custom data
    shape) rather than fixed to a loose Record<string, unknown>.
  - Define the app's own custom node-data interface and parameterize the library's node type with it.
  - Confirm custom node components receive strongly-typed data props (autocomplete/compile
    errors on typos) rather than any.
  - Run the project's typecheck and confirm zero new any/type errors introduced by the integration.
success: >
  Node/edge data is fully typed end-to-end using the app's own custom shape, with no `any`
  leakage and full IDE autocomplete on custom node data fields.
failure_outcomes:
  - when: The library's core types aren't generic and force a loose data shape.
    explanation: >
      Docs/types make this limitation explicit (e.g. a documented type-assertion pattern)
      rather than the developer discovering a silent `any` escape hatch.
    alternative: Developer wraps the library's type with a local generic helper/assertion at the boundary.
  - when: A required peer type package (e.g. React's own types) is missing/mismatched in version.
    explanation: The TypeScript error names the specific type conflict/version mismatch.
    alternative: Developer aligns the peer type package version and retries.
  - when: Custom node data is passed with a field-name typo.
    explanation: This is a compile-time TypeScript error naming the exact mismatched key - the desired outcome, not a library failure.
    alternative: "terminal - developer fixes the typo per the compiler message"
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "React Flow's generic Node<T>/Edge<T> TypeScript types (reactflow.dev/learn/advanced-use/typescript)"
  not_derived_from_our_flows: true
maps_to_flows:
  - "src/ir/__specs__/flows/isNodeType.flow.md"
  - "src/ir/__specs__/flows/isEdgeType.flow.md"
  - "src/ir/__specs__/flows/isDirection.flow.md"
---

# J-021: Get strict TypeScript types for custom node/edge data
