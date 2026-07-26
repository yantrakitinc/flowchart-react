---
id: J-014
slug: integrate-in-nextjs-ssr-app
persona: >
  Developer adding the diagram to a Next.js App Router page that's server-rendered by default,
  having previously only used diagram libraries in client-only SPAs.
intent: >
  Get the diagram rendering correctly inside a Next.js (or similar SSR/SSG framework) page
  without hydration mismatches or "window is not defined" crashes.
trigger: >
  The developer drops the component into a server component page and immediately hits an
  SSR-specific error, a well-known pain point for canvas/DOM-measurement-heavy React libraries.
steps:
  - Identify that the diagram needs client-side-only rendering (measures DOM, uses browser
    APIs) and find the documented SSR guidance.
  - Mark the diagram's usage boundary as client-rendered per the framework's convention
    (e.g. a client directive, or a dynamic import with SSR disabled).
  - Re-run the page and confirm no hydration-mismatch warnings appear in the console.
  - Confirm the diagram still receives its initial node/edge data correctly when rendered
    client-side within an otherwise server-rendered page.
  - Confirm any first-paint fallback (loading skeleton) is acceptable while the client bundle loads.
success: >
  The diagram renders correctly inside the SSR framework page with zero hydration warnings
  and no runtime "window/document is not defined" errors.
failure_outcomes:
  - when: The developer forgets the client-boundary directive and the framework throws a
      server-side reference error accessing a browser API.
    explanation: The error names the specific browser API accessed during SSR.
    alternative: Developer adds the client boundary and retries.
  - when: The diagram is dynamically imported without disabling SSR and a hydration mismatch appears.
    explanation: The warning names the specific mismatch (e.g. server-computed layout vs client re-layout).
    alternative: Developer disables SSR for that import or defers layout computation to a client-only effect.
  - when: Initial node/edge data is fetched server-side but the diagram needs it before its
      first client render.
    explanation: Guidance clarifies how to pass server-fetched data as serializable props across the boundary.
    alternative: Developer passes plain serializable props (not functions/class instances) across the server/client boundary.
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "React Flow v12's explicit SSR/SSG support as a headline migration feature (reactflow.dev/whats-new/2024-07-09)"
    - "Common Next.js client-boundary conventions for DOM-measurement-dependent canvas libraries"
  not_derived_from_our_flows: true
maps_to_flows:
  - "src/react/__specs__/flows/render-flowchart.flow.md"
---

# J-014: Integrate the diagram in a Next.js / SSR app
