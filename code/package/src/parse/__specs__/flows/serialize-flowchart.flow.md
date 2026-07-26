# serializeFlowchart

## Purpose

Renders an `iFlowGraph` back to Mermaid-like DSL text.

## Paths

See the `paths:` field in the machine spec fenced block below for the full happy / edge-case enumeration.

```yaml
flow: serializeFlowchart
kind: helper
source: src/parse/serializeFlowchart.ts
symbol: serializeFlowchart
inputs:
  graph: "iFlowGraph — { id, name, direction, nodes: iFlowNode[], edges: iFlowEdge[] }; id/name are never read by
    this function (they carry no DSL representation); direction, nodes, edges are read in full"
returns:
  - "string — DSL text: one 'flowchart <direction>' header line, then one line per node (in graph.nodes order), then
     one line per edge (in graph.edges order), all joined by '\\n'. Every node line ends with an explicit
     ':::<type>' class and every edge line's glyph segment ends with an explicit ':::<type>' class BEFORE the
     target node id — this is what lets parseFlowchart recover the exact original type on re-parse, since shape and
     glyph alone are ambiguous (start/end share the stadium shape; default/happy share the '-->' glyph)."
throws: []
calls:
  - shapeFor
called_by:
  - "src/parse/index.ts (barrel re-export)"
  - "src/index.ts (package root barrel — the published @yantrakit/flowchart-react entry point)"
  - "src/parse/serializeFlowchart.test.ts (direct unit-test caller)"
  - "src/parse/parseFlowchart.test.ts (round-trip assertion: parseFlowchart(serializeFlowchart(original)))"
  - "any host app / AI agent importing @yantrakit/flowchart-react that needs to render/store/hand an LLM a text form
     of an in-memory iFlowGraph"
emits_events: []
side_effects_on_success:
  - "none — pure computation; returns a freshly-built string, mutates nothing"
side_effects_on_failure: "none — this function has no throw path (see 'throws: []')"
transaction: "none — no I/O"
test: src/parse/serializeFlowchart.test.ts
spec: src/parse/__specs__/spec.md
ai_agent_action:
  when_to_call: >
    the caller holds an in-memory iFlowGraph and needs Mermaid-like DSL text back — e.g. to display/store/hand to an
    LLM, or to feed straight back into parseFlowchart for a round trip.
  when_not_to_call: >
    the caller needs a byte-for-byte-preserving round trip of hand-authored source text (serializeFlowchart
    RE-GENERATES text from the IR; it does not remember whitespace, comment placement, or the original glyph/shape
    choice for a type that has more than one valid rendering — see edge_boundary_glyph_choice_not_preserved); or the
    caller needs node.data preserved (it is always dropped — see edge_boundary_node_data_dropped).
  natural_language_examples:
    - "Turn this graph back into flowchart text"
    - "Give me the Mermaid-like DSL for this diagram object"
    - "Serialize this iFlowGraph so I can paste it somewhere"
  agent_invocation: "in-process function call: serializeFlowchart(graph) — no HTTP, no UI nav, no server action"
  confirm_with_user_before: "none — read-only, pure computation, no side effects, nothing persisted"
  summarize_to_user_after: "Serialized the graph to {output.split('\\n').length} line(s) of DSL text."
paths:
  happy:
    - "Input: iFlowGraph { direction: 'LR', nodes: [ {id:'S',label:'Start',type:'start'},
       {id:'A',label:'Do thing',type:'action'}, {id:'D',label:'Check?',type:'decision'},
       {id:'W',label:'Warn',type:'warning'}, {id:'E',label:'End',type:'end'} ], edges: [
       {id:'e0',from:'S',to:'A',type:'default'}, {id:'e1',from:'A',to:'D',type:'default',label:'yes'},
       {id:'e2',from:'D',to:'W',type:'warning',label:'maybe'} ] }"
    - "Line 1: 'flowchart LR' (header, from graph.direction)."
    - "Node loop (graph.nodes order): shapeFor('start','Start') -> '([Start])' so line is 'S([Start]):::start';
       shapeFor('action','Do thing') -> '[Do thing]' so line is 'A[Do thing]:::action'; shapeFor('decision','Check?')
       -> '{Check?}' so line is 'D{Check?}:::decision'; shapeFor('warning','Warn') falls into the default bracket
       branch -> '[Warn]' so line is 'W[Warn]:::warning'; shapeFor('end','End') -> '([End])' so line is
       'E([End]):::end'."
    - "Edge loop (graph.edges order): e0 has no label -> 'S -->:::default A'; e1 has label 'yes' ->
       'A -->|yes|:::default D'; e2 has label 'maybe' and type 'warning' (glyph '-.->' ) -> 'D -.->|maybe|:::warning
       W'."
    - "Returns the 8 lines joined by '\\n' in the order: header, then every node line, then every edge line."
  edge_boundary_empty_graph:
    - "Input: { id:'g', name:'G', direction:'LR', nodes: [], edges: [] }"
    - "The node loop and edge loop both iterate zero times."
    - "Returns exactly the single-line string 'flowchart LR' — no trailing newline, no empty node/edge lines."
  edge_boundary_shape_by_type:
    - "type 'decision' -> shapeFor returns '{label}' (its own branch)."
    - "type 'start' or 'end' -> shapeFor returns '([label])' (shared branch)."
    - "every other type (action, error, warning, link) -> shapeFor falls through to the default branch and returns
       '[label]' (the bracket/action shape) — the emitted ':::<type>' suffix, not the shape, is what distinguishes
       these four types from each other and from 'action' on re-parse."
  edge_boundary_glyph_by_edge_type:
    - "GLYPH_BY_EDGE_TYPE maps 'happy' AND 'default' to the SAME glyph '-->' — the two types are only distinguished
       in the output by their differing trailing ':::happy' / ':::default' class suffix, not by the glyph."
    - "'warning' maps to '-.->'; 'error' maps to '==>'."
  edge_boundary_edge_label_present_vs_absent:
    - "edge.label !== undefined -> a '|label|' segment is inserted between the glyph and the ':::type' suffix
       (e.g. 'A -->|ok|:::happy B')."
    - "edge.label === undefined -> the label segment is the empty string, so the line reads 'A -->:::default B'
       with no pipes at all."
    - "edge.label === '' (present but empty) is NOT exercised by the current test suite for serialize; per the
       `!== undefined` check it WOULD still emit an empty '||' pair — KNOWN-NOT-VALIDATED: no test asserts this
       exact empty-string-label byte sequence today; low risk since the branch condition itself (`!== undefined`)
       is fully covered by the present/absent cases above, and an empty label is a cosmetic degenerate of the
       present-label branch, not a distinct code path."
  edge_boundary_node_data_dropped:
    - "A node carrying `data: { secret: true }` is serialized identically to the same node with no `data` field at
       all — shapeFor and the node-line template never read `node.data`; the returned text contains no trace of it
       (asserted via `.not.toContain('secret')` in the test suite)."
  edge_boundary_glyph_choice_not_preserved:
    - "Because 'happy' and 'default' share the '-->' glyph (see edge_boundary_glyph_by_edge_type), and 'start' and
       'end' share the '([...])' shape (see edge_boundary_shape_by_type), the ORIGINAL DSL author's glyph/shape
       choice is never itself round-trip-relevant — only the explicit ':::type' suffix this function always emits
       is; a caller relying on glyph/shape alone to distinguish these pairs after a serialize+parse round trip would
       be wrong to do so, but the explicit-class emission makes that a non-issue for this package's own round trip
       (see parse-flowchart.flow.md edge_boundary_explicit_class_overrides_shape_and_position)."
mermaid: |
  flowchart TD
    Start([start: graph]) --> Header[emit 'flowchart <direction>']
    Header --> NodeLoop{more nodes?}
    NodeLoop -->|yes| Shape[shapeFor node.type, node.label]
    Shape --> NodeLine[emit '<id><shape>:::<type>']
    NodeLine --> NodeLoop
    NodeLoop -->|no| EdgeLoop{more edges?}
    EdgeLoop -->|yes| Glyph[GLYPH_BY_EDGE_TYPE lookup + optional '|label|']
    Glyph --> EdgeLine[emit '<from> <glyph><label?>:::<type> <to>']
    EdgeLine --> EdgeLoop
    EdgeLoop -->|no| Join([join all lines with newline, return]):::happy
```
