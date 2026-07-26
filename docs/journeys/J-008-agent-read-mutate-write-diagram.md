---
id: J-008
slug: agent-read-mutate-write-diagram
persona: >
  An AI coding/workflow agent (LLM-backed automation) tasked with "add a retry step after the
  payment node" in an existing diagram stored in a project, acting purely on data.
intent: >
  Read the current diagram's node/edge data structure, apply a structural mutation
  (insert/remove/rewire a node), and write the result back in a form the app can re-render.
trigger: >
  A user or upstream automation asks the agent to modify an existing flow; the agent must
  operate on data, not pixels, mirroring how tooling mutates React Flow's nodes/edges arrays.
steps:
  - Read the diagram's current source-of-truth representation via whatever accessor the
    library/app exposes.
  - Parse/deserialize it into an addressable structure (nodes with ids, edges with source/target).
  - Locate the target insertion point (e.g. the edge leaving the "Payment" node).
  - Apply the mutation - insert a new node, insert two edges around it, remove the superseded edge.
  - Serialize the mutated structure back into the same representation format the app expects.
  - Write/save it back so the app can re-render, and confirm no other node/edge was altered.
success: >
  The diagram gains exactly the intended new node and rewired edges; all other pre-existing
  node/edge ids and data are preserved untouched; the app re-renders the updated diagram correctly.
failure_outcomes:
  - when: The agent reads a diagram version another process modified concurrently, before its
      write completes.
    explanation: A conflict/version-mismatch response names the outdated revision rather than overwriting silently.
    alternative: Agent re-reads the latest state and reapplies the mutation.
  - when: The target node id named in the instruction no longer exists in the diagram.
    explanation: The response names the missing id and lists nearby/similar ids as candidates.
    alternative: Agent asks for clarification or infers via a label match, then retries.
  - when: The agent's write payload is malformed relative to the schema (e.g. missing required
      edge fields).
    explanation: >
      A validation error names the exact missing/invalid field and rejects the write, leaving
      prior state intact.
    alternative: Agent corrects the payload and retries.
  - when: The mutation would introduce a duplicate id or a dangling edge.
    explanation: The write is rejected with the specific conflict named.
    alternative: Agent regenerates a unique id / fixes the reference and retries.
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "React Flow's imperative nodes/edges mutation API consumed by external automation/tooling layers"
    - "Chat-agent operability conventions for machine-actionable data mutation (read -> mutate -> validate -> write)"
  not_derived_from_our_flows: true
maps_to_flows:
  - "src/parse/__specs__/flows/parse-flowchart.flow.md"
  - "src/parse/__specs__/flows/serialize-flowchart.flow.md"
---

# J-008: An agent programmatically reads, mutates, and writes back a diagram
