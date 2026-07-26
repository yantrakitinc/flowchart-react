---
id: J-013
slug: evaluate-library-before-adopting
persona: >
  Senior frontend engineer doing a "build vs buy" spike, comparing Mermaid, React Flow, Reaflow,
  GoJS, and this library before writing any integration code for a new product feature.
intent: >
  Assess bundle size, license, dependency footprint, TypeScript support, and maintenance
  activity to decide whether to adopt this library at all.
trigger: >
  The engineer is running a comparative spike across peer libraries, the way developers check
  npm/bundlephobia/GitHub activity before committing to a new dependency.
steps:
  - Check the package's published size/dependency footprint and peer dependency requirements
    (React version range, styling deps).
  - Check license terms for commercial-use compatibility.
  - Skim the README/docs for feature coverage against the specific need (e.g. does it support
    custom nodes and auto-layout out of the box, or need an extra layout package).
  - Check TypeScript type coverage and whether types ship with the package.
  - Check recent release/maintenance activity (changelog freshness, issue responsiveness) as a
    proxy for ongoing support.
  - Make a go/no-go adoption decision and, if "go," proceed to a real integration (J-001/J-002).
success: >
  The engineer reaches a confident, informed adopt/reject decision using publicly discoverable
  package facts, without needing throwaway integration code to find basic facts.
failure_outcomes:
  - when: The README doesn't state the minimum supported React version.
    explanation: The gap is visible as an omission the evaluator must dig for elsewhere (package.json peerDependencies).
    alternative: Engineer checks peerDependencies directly as the authoritative source.
  - when: The license file is missing or ambiguous for the intended commercial use.
    explanation: The absence itself is the finding - the evaluator flags it as an adoption blocker.
    alternative: Engineer contacts the maintainer/checks the repo's LICENSE file, or rejects adoption until resolved.
  - when: A needed feature (e.g. built-in auto-layout) actually requires an additional peer
      package not mentioned prominently.
    explanation: Docs should name the extra required package rather than implying it's built-in.
    alternative: Engineer factors the extra dependency into the size/footprint comparison.
  - when: The most recent release is stale relative to the peer set being compared.
    explanation: This is itself the finding, not a failure needing recovery.
    alternative: "terminal - the evaluator factors this into the go/no-go decision"
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "Standard npm-package due-diligence conventions (bundlephobia size checks, peerDependencies review, LICENSE review) applied before adopting any React UI dependency"
    - "Comparative landscape of Mermaid / React Flow (@xyflow/react) / Reaflow as the peer set developers already benchmark against"
  not_derived_from_our_flows: true
maps_to_flows:
  - "docs:README.md"
---

# J-013: Evaluate the library before adopting it (build-vs-buy spike)
