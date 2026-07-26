# parseFlowchart

## Purpose

Tokenizes and parses Mermaid-like flowchart DSL text into an `iFlowGraph`.

## Paths

See the `paths:` field in the machine spec fenced block below for the full happy / edge-case enumeration.

```yaml
flow: parseFlowchart
kind: helper
source: src/parse/parseFlowchart.ts
symbol: parseFlowchart
inputs:
  text: "string — Mermaid-like flowchart DSL text, split on '\\n' into lines and processed top to bottom"
  options: >
    "iParseOptions (optional) — { direction?: iDirection (used only when the text has no 'flowchart <DIR>' /
    'graph <DIR>' header line), id?: string (defaults to 'flowchart'), name?: string (defaults to 'Flowchart') }"
returns:
  - "iFlowGraph — { id, name, direction, nodes: iFlowNode[], edges: iFlowEdge[] } on successful parse of well-formed
     DSL text; node.type is resolved per node via explicit ':::class' > shape ([]/{}/([])) > structural position
     (no-incoming-edge => 'start', no-outgoing-edge => 'end', else 'action')"
throws:
  - "FlowchartParseError — \"unknown direction '<token>'\" when a header's direction token uppercases to something
     outside TD/TB/BT/LR/RL"
  - "FlowchartParseError — \"missing direction\" when a 'flowchart'/'graph' header line has no direction token at all"
  - "FlowchartParseError — \"missing header (expected \\\"flowchart <DIR>\\\")\" when the first non-blank/non-comment
     line is not a header AND no options.direction was supplied"
  - "FlowchartParseError — \"malformed ::: class annotation\" when ':::' is not immediately followed by an
     [A-Za-z]+ identifier (triggers identically whether the ':::' sits after a node token or after an edge glyph)"
  - "FlowchartParseError — \"unknown node class '<name>'\" when an explicit ':::name' after a node token is not a
     valid iNodeType"
  - "FlowchartParseError — \"unknown edge class '<name>'\" when an explicit ':::name' after an edge glyph is not a
     valid iEdgeType"
  - "FlowchartParseError — 'unclosed bracket \"[\"' when a '[' shape opener has no matching ']' on the same line"
  - "FlowchartParseError — 'unclosed brace \"{\"' when a '{' shape opener has no matching '}' on the same line"
  - "FlowchartParseError — 'unclosed stadium bracket \"([\"' when a '([' shape opener has no matching '])' on the
     same line"
  - "FlowchartParseError — \"expected a node id\" when a node-token position does not match /^[A-Za-z0-9_]+/"
  - "FlowchartParseError — \"expected an edge glyph (-->, -.->,  ==>)\" when text remains on a chain line after a
     node token but does not match one of the three recognized glyphs"
  - "FlowchartParseError — 'unclosed edge label \"|\"' when a '|' after an edge glyph has no matching closing '|' on
     the same line"
  - "FlowchartParseError — \"empty diagram\" when, after processing every line, zero nodes were ever declared
     (all-blank/all-comment input, or a header line with no statement lines following it)"
calls:
  - skipWhitespace
  - stripComment
  - normalizeDirection
  - isDirection
  - parseExplicitClass
  - isNodeType
  - isEdgeType
  - parseShape
  - parseNodeToken
  - parseChainLine
  - resolveNodeTypes
  - "new FlowchartParseError(reason, line, column?)"
called_by:
  - "src/parse/index.ts (barrel re-export)"
  - "src/index.ts (package root barrel — the published @yantrakit/flowchart-react entry point)"
  - "src/parse/parseFlowchart.test.ts (direct unit-test caller)"
  - "src/parse/serializeFlowchart.test.ts (round-trip assertion: parseFlowchart(serializeFlowchart(...)))"
  - "any host app / AI agent importing @yantrakit/flowchart-react"
emits_events: []
side_effects_on_success:
  - "none — pure computation; returns a freshly-allocated iFlowGraph, mutates nothing outside its own local Map/arrays"
side_effects_on_failure: "none — throws synchronously before returning; no partial graph is exposed to the caller"
transaction: "none — no I/O, no multi-step external write to roll back"
test: src/parse/parseFlowchart.test.ts
spec: src/parse/__specs__/spec.md
ai_agent_action:
  when_to_call: >
    the user (or an upstream agent step) has Mermaid-like flowchart DSL text and needs it as a typed iFlowGraph —
    e.g. before calling detectPaths, layout, or rendering <FlowChart>.
  when_not_to_call: >
    the caller already holds an iFlowGraph (no text to parse); or the text uses grammar this parser does not support
    (subgraph/end, style/class statements, click directives, multi-line labels) — those will throw or silently
    misparse, and the agent should say so rather than retry the same input.
  natural_language_examples:
    - "Parse this flowchart text into nodes and edges"
    - "Turn this Mermaid-like diagram into the graph format"
    - "Why does parsing this flowchart text fail?"
    - "What direction/nodes/edges does this diagram text describe?"
  agent_invocation: "in-process function call: parseFlowchart(text, options?) — no HTTP, no UI nav, no server action"
  confirm_with_user_before: "none — read-only, pure computation, no side effects, nothing persisted"
  summarize_to_user_after: >
    on success: "Parsed {nodes.length} node(s) and {edges.length} edge(s), direction {direction}."
    on failure: "Parse failed at line {line}{, column {column}}: {reason}. Fix that line and retry."
paths:
  happy:
    - "Input: 'flowchart TD\\nS([Start]) --> A[Do thing]\\nA -->|yes| D{Check?}\\nD -->|no| E([End])'"
    - "Header line 'flowchart TD' matches HEADER_RE with direction token 'TD'; direction set to 'TD'; header marked
       consumed (headerConsumedAt = 1)."
    - "Line 2: node 'S' created with stadium shape ('([Start])') -> label 'Start'; edge glyph '-->' (type 'default')
       to node 'A' created with action shape ('[Do thing]') -> label 'Do thing'."
    - "Line 3: node 'A' re-referenced (draft already exists, no shape token given here); edge glyph '-->' with label
       token '|yes|' -> label 'yes', type 'default'; target node 'D' created with decision shape ('{Check?}') ->
       label 'Check?'."
    - "Line 4: node 'D' re-referenced; edge glyph '-->' with label '|no|' -> label 'no'; target node 'E' created
       with stadium shape ('([End])') -> label 'End'."
    - "resolveNodeTypes runs after all lines: S (stadium, no incoming edge) -> 'start'; A (action shape) ->
       'action'; D (decision shape) -> 'decision'; E (stadium, no outgoing edge) -> 'end'."
    - "Returns { id: 'flowchart', name: 'Flowchart', direction: 'TD', nodes: [S,A,D,E in first-seen order],
       edges: [e0(S->A,default), e1(A->D,default,label:'yes'), e2(D->E,default,label:'no')] }."
  error_unknown_direction:
    - "Input: 'flowchart XX\\nA --> B'"
    - "HEADER_RE matches 'flowchart XX'; normalizeDirection('XX', 1) uppercases to 'XX'; isDirection('XX') is false."
    - "Throws FlowchartParseError(\"unknown direction 'XX'\", line: 1, column: 1 (default))."
  error_missing_direction:
    - "Input: 'flowchart\\nA --> B'"
    - "HEADER_RE matches 'flowchart' with an undefined capture group 2 (no direction token present)."
    - "Throws FlowchartParseError('missing direction', line: 1)."
  error_missing_header:
    - "Input: 'A --> B' with no options.direction supplied"
    - "The first non-blank line does not satisfy the header-consumption guard AND direction is still undefined."
    - "Throws FlowchartParseError('missing header (expected \"flowchart <DIR>\")', line: 1)."
  error_malformed_class:
    - "node-position variant — Input: 'flowchart TD\\nA::: --> B'; parseExplicitClass sees ':::' at the cursor but
       /^[A-Za-z]+/ finds no identifier immediately after it."
    - "Throws FlowchartParseError('malformed ::: class annotation', line: 2, column: cursor.pos+1)."
    - "edge-position variant — Input: 'flowchart TD\\nA -->::: B'; the identical parseExplicitClass call runs again
       after the edge glyph is consumed; same throw shape, later column."
  error_unknown_class:
    - "node-class variant — Input: 'flowchart TD\\nA:::bogus --> B'; parseExplicitClass returns 'bogus';
       isNodeType('bogus') is false."
    - "Throws FlowchartParseError(\"unknown node class 'bogus'\", line: 2)."
    - "edge-class variant — Input: 'flowchart TD\\nA -->:::bogus B'; parseExplicitClass returns 'bogus' after the
       glyph; isEdgeType('bogus') is false."
    - "Throws FlowchartParseError(\"unknown edge class 'bogus'\", line: 2)."
  error_unclosed_shape_bracket:
    - "bracket variant — Input: 'flowchart TD\\nA[Oops --> B'; parseShape sees '[' but
       line.indexOf(']', pos+1) returns -1. Throws 'unclosed bracket \"[\"' (line 2)."
    - "brace variant — Input: 'flowchart TD\\nA{Oops --> B'; same shape via '{'; throws 'unclosed brace \"{\"'
       (line 2)."
    - "stadium variant — Input: 'flowchart TD\\nA([Oops --> B'; line.indexOf('])', pos+2) returns -1; throws
       'unclosed stadium bracket \"([\"' (line 2)."
  error_expected_node_id:
    - "Input: 'flowchart TD\\n--> B'"
    - "parseNodeToken skips whitespace then runs NODE_ID_RE against '--> B'; no match (starts with '-')."
    - "Throws FlowchartParseError('expected a node id', line: 2, column: 1)."
  error_expected_edge_glyph:
    - "Input: 'flowchart TD\\nA -> B'"
    - "After node 'A' is parsed, EDGE_GLYPH_RE (/^(-\\.->|-->|==>)/) does not match the remaining '-> B' (a
       single-dash arrow is not a recognized glyph)."
    - "Throws FlowchartParseError('expected an edge glyph (-->, -.->,  ==>)', line: 2)."
  error_unclosed_edge_label:
    - "Input: 'flowchart TD\\nA -->|oops B'"
    - "After the '-->' glyph the cursor sees '|'; line.indexOf('|', pos+1) returns -1 (no closing pipe on the
       line)."
    - "Throws FlowchartParseError('unclosed edge label \"|\"', line: 2)."
  error_empty_diagram:
    - "blank/comment-only variant — Input: '   \\n%% only a comment\\n'; every line strips to length 0 after
       stripComment+trim and is skipped; order.length is 0 after the loop."
    - "Throws FlowchartParseError('empty diagram', line: rawLines.length) — rawLines.length is always >= 1 since
       ''.split('\\n') yields ['']."
    - "header-only variant — Input: 'flowchart TD'; the header line is consumed (direction set) but no statement
       line follows; order.length is still 0; same throw."
  edge_boundary_direction_normalization:
    - "'flowchart TB\\nA --> B' — normalizeDirection uppercases 'TB' then the TB->TD remap fires; direction is
       'TD', not 'TB'."
    - "'flowchart td\\nA --> B' — lowercase token is uppercased before the TB remap check; accepted, direction
       'TD'."
    - "'graph BT\\n...' / 'flowchart LR\\n...' / 'flowchart RL\\n...' — both 'flowchart' and 'graph' keywords are
       accepted as the header; BT/LR/RL pass through unchanged (no remap)."
  edge_boundary_options_direction:
    - "'A --> B' with { direction: 'LR' } and no header line — headerConsumedAt stays -1, but direction was
       pre-seeded from options so the 'missing header' throw never fires; result direction is 'LR'."
    - "'flowchart RL\\nA --> B' with { direction: 'LR' } — an explicit header line always overrides options.direction;
       result direction is 'RL'."
  edge_boundary_options_id_name:
    - "no options — result.id defaults to 'flowchart', result.name defaults to 'Flowchart'."
    - "{ id: 'g1', name: 'My Graph' } — result.id is 'g1', result.name is 'My Graph'."
  edge_boundary_redeclared_node:
    - "'flowchart TD\\nX --> A --> B\\nA[Now Labeled] --> C' — node 'A' is first created bare (label defaults to
       'A', no shape) on line 2, then re-referenced on line 3 with a '[Now Labeled]' shape token; parseNodeToken
       finds the EXISTING draft (never creates a duplicate) and overwrites its label/shape in place. 'A' already
       has an incoming edge (from X) and an outgoing edge (to B), so it resolves to type 'action' regardless of the
       later shape assignment — it is never a start/end candidate."
  edge_boundary_comments_and_blank_lines:
    - "'flowchart TD\\n%% a full-line comment\\nA --> B %% trailing' — stripComment truncates each raw line at the
       first '%%' BEFORE trimming/parsing; a whole-line comment strips to '' and is skipped by the blank-line
       continue; a trailing comment is removed before the chain parser ever sees it, so 'A --> B %% trailing'
       behaves identically to 'A --> B'."
  edge_boundary_lone_node:
    - "'flowchart TD\\nA[Solo]' — a single chain statement with no edge glyph following the first node token;
       parseChainLine's loop hits end-of-line immediately and returns having pushed zero edges. Result: 1 node,
       0 edges."
  edge_boundary_start_end_promotion_entry_actions:
    - "'flowchart TD\\nA[A] --> M[M]\\nC[C] --> M' — A and C are both bracket-shaped ('action'), so neither
       resolves positionally (only bare/stadium shapes fall through to the position branch); the post-pass promotes
       EVERY entry action with no incoming edge (not just the first) to 'start' — both A and C become 'start'; M
       (no outgoing edge) becomes 'end' via the symmetric terminal-action promotion."
  edge_boundary_start_end_promotion_fallback:
    - "'flowchart TD\\nA[A] --> B[B] --> A' — a 2-cycle where every node has an incoming edge, so there is no
       'entry action' candidate; the fallback promotes the first non-explicit-class node in first-seen order ('A')
       to 'start'."
  edge_boundary_no_start_when_all_explicit:
    - "'flowchart TD\\nA:::action --> B:::action --> A' — both nodes carry an explicit ':::action' class, so
       resolveNodeTypes's explicitType branch always wins for both (the position branch is never reached), and the
       start-promotion fallback only considers non-explicit nodes — none exist here. No node is ever typed 'start'."
  edge_boundary_terminal_action_promotion:
    - "'flowchart TD\\nS([S]) --> A[A]\\nS --> B[B]' — S resolves positionally to 'start'; A and B are both
       bracket-shaped ('action') with no outgoing edge; the terminal-action promotion pass promotes BOTH (not just
       one) to 'end'."
  edge_boundary_bare_id_positional_resolution:
    - "'flowchart TD\\nA --> B --> C' — none of A/B/C carry a shape token, so all three fall through to
       position-based resolution exactly like stadium nodes: A (no incoming) -> 'start', C (no outgoing) -> 'end',
       B (both present) -> 'action'."
  edge_boundary_explicit_class_overrides_shape_and_position:
    - "'flowchart TD\\nA[Do thing]:::warning --> B' — A has an action shape ('[Do thing]') AND an explicit
       ':::warning' class; explicitType is checked FIRST in resolveNodeTypes, so A resolves to 'warning', not
       'action'."
    - "'flowchart TD\\nA -->:::happy B' — the edge's glyph-derived type ('default', from '-->') is overwritten by
       the trailing explicit ':::happy' class; edges[0].type is 'happy'."
  edge_boundary_edge_glyphs_and_labels:
    - "'flowchart TD\\nA --> B\\nB -.-> C\\nC ==> D' — the three glyphs map via EDGE_GLYPH_RE + EDGE_TYPE_BY_GLYPH to
       types 'default', 'warning', 'error' respectively."
    - "'flowchart TD\\nA -->|yes| B' — the '|yes|' token between the glyph and the target node is captured as
       edges[0].label; an edge with no '|...|' token has label left undefined (never an empty string)."
    - "'flowchart TD\\nA --> B --> C' — edge ids are assigned sequentially 'e0','e1',... from a single shared
       edgeCounter across the whole document, independent of which line/chain produced them."
mermaid: |
  flowchart TD
    Start([start: rawLines = text.split newline]) --> Loop{more lines?}
    Loop -->|no| CheckEmpty{order.length == 0?}
    Loop -->|yes| Strip[stripComment + trim line]
    Strip --> Blank{stripped empty?}
    Blank -->|yes| Loop
    Blank -->|no| HeaderCheck{matches HEADER_RE\nand not yet consumed\nand no nodes/edges yet?}
    HeaderCheck -->|yes, no dir token| ErrMissingDir([throw: missing direction]):::error
    HeaderCheck -->|yes, dir token| NormDir[normalizeDirection]
    NormDir -->|invalid token| ErrUnknownDir([throw: unknown direction]):::error
    NormDir -->|valid| Loop
    HeaderCheck -->|no, and direction still undefined| ErrMissingHeader([throw: missing header]):::error
    HeaderCheck -->|no, direction already known| ParseChain[parseChainLine]
    ParseChain -->|node id missing| ErrNodeId([throw: expected a node id]):::error
    ParseChain -->|::: malformed| ErrMalformedClass([throw: malformed class]):::error
    ParseChain -->|::: unknown class| ErrUnknownClass([throw: unknown node/edge class]):::error
    ParseChain -->|unclosed shape| ErrUnclosedShape([throw: unclosed bracket/brace/stadium]):::error
    ParseChain -->|no edge glyph, more text left| ErrGlyph([throw: expected an edge glyph]):::error
    ParseChain -->|unclosed edge label| ErrLabel([throw: unclosed edge label]):::error
    ParseChain -->|ok| Loop
    CheckEmpty -->|yes| ErrEmpty([throw: empty diagram]):::error
    CheckEmpty -->|no| Resolve[resolveNodeTypes: explicit > shape > position + start/end ensure-pass]
    Resolve --> Return([return iFlowGraph]):::happy
```
