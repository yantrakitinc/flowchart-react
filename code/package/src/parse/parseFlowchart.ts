/**
 * Parse a Mermaid-like flowchart DSL string into the {@link iFlowGraph} IR.
 *
 * Grammar (a deliberately small, Mermaid-familiar subset):
 *   header : ('flowchart' | 'graph') DIR            DIR ∈ TD|TB|BT|LR|RL  (TB→TD)
 *   nodeToken : id shape? class?    id : [A-Za-z0-9_]+
 *   shape : '[' text ']' (action) | '{' text '}' (decision) | '([' text '])' (start/end)
 *   class : ':::' (start|end|action|decision|error|warning|link)
 *   link  : ('-->' | '-.->' | '==>') ('|' text '|')? (':::' edgeClass)?
 *   edgeStmt : nodeToken (link nodeToken)+          (chains: A --> B --> C)
 *
 * Node-type resolution: explicit class → shape → graph position (no incoming ⇒ start,
 * no outgoing ⇒ end). Edge-type resolution: explicit edgeClass → glyph.
 */
import {
  iDirection,
  iEdgeType,
  iFlowEdge,
  iFlowGraph,
  iFlowNode,
  iNodeType,
  isEdgeType,
  isNodeType,
} from '../ir/types';
import { FlowchartParseError } from './errors';

/** Ordered link glyphs — longest first so '-.->' is matched before '-->'. */
const LINKS: { glyph: string; type: iEdgeType }[] = [
  { glyph: '-.->', type: 'warning' },
  { glyph: '==>', type: 'error' },
  { glyph: '-->', type: 'default' },
];

// Node ids are alphanumeric + underscore. Dashes are excluded so that `A-->B`
// (no surrounding spaces) tokenizes cleanly instead of the id eating the `--`.
const ID_RE = /^[A-Za-z0-9_]+/;

/** Mutable node record accumulated during parsing, resolved to iFlowNode at the end. */
interface iNodeAcc {
  id: string;
  label?: string;
  type?: iNodeType;
  explicit: boolean;
  shape?: 'action' | 'decision' | 'stadium';
  description?: string;
}

/** Options for {@link parseFlowchart}. */
export interface iParseOptions {
  /** Override/supply the header direction (header still required unless set). */
  direction?: iDirection;
  /** id/name for the resulting graph. */
  id?: string;
  name?: string;
}

/** Compile a DSL string into the IR. Throws {@link FlowchartParseError} on malformed input. */
export function parseFlowchart(text: string, options: iParseOptions = {}): iFlowGraph {
  const rawLines = text.split(/\r?\n/);
  const nodes = new Map<string, iNodeAcc>();
  const edges: iFlowEdge[] = [];
  let direction: iDirection | undefined = options.direction;
  let headerSeen = false;
  let edgeCounter = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const lineNo = i + 1;
    const line = stripComment(rawLines[i]).trim();
    if (line === '') continue;

    if (!headerSeen) {
      const header = tryParseHeader(line);
      if (header) {
        direction = normalizeDirection(header, lineNo);
        headerSeen = true;
        continue;
      }
      if (!options.direction) {
        throw new FlowchartParseError(
          `expected header "flowchart <TD|BT|LR|RL>" as the first line, got "${line}"`,
          lineNo
        );
      }
      headerSeen = true;
    }

    parseStatement(line, lineNo, nodes, edges, () => `e${edgeCounter++}`);
  }

  if (!direction) {
    throw new FlowchartParseError('missing flow direction (no header, no options.direction)', 1);
  }
  if (nodes.size === 0) {
    throw new FlowchartParseError('diagram has no nodes', 1);
  }

  return {
    id: options.id ?? 'flowchart',
    name: options.name ?? 'flowchart',
    direction,
    nodes: resolveNodeTypes(nodes, edges),
    edges,
  };
}

/** Remove a `%%` comment (and everything after it) from a line. */
function stripComment(line: string): string {
  const idx = line.indexOf('%%');
  return idx === -1 ? line : line.slice(0, idx);
}

function tryParseHeader(line: string): string | null {
  const m = /^(?:flowchart|graph)\s+([A-Za-z]+)\s*$/.exec(line);
  return m ? m[1] : null;
}

function normalizeDirection(token: string, lineNo: number): iDirection {
  const t = token.toUpperCase();
  const dir = t === 'TB' ? 'TD' : t;
  if (dir === 'TD' || dir === 'BT' || dir === 'LR' || dir === 'RL') return dir;
  throw new FlowchartParseError(
    `unknown direction "${token}" (expected TD, TB, BT, LR or RL)`,
    lineNo
  );
}

/** Parse one content line: a lone node declaration or an edge chain. Mutates nodes/edges. */
function parseStatement(
  line: string,
  lineNo: number,
  nodes: Map<string, iNodeAcc>,
  edges: iFlowEdge[],
  nextEdgeId: () => string
): void {
  const col = 1;
  let rest = line;

  const first = consumeNodeToken(rest, lineNo, col);
  upsertNode(nodes, first.node);
  rest = first.rest;
  let prevId = first.node.id;

  while (rest.trim() !== '') {
    rest = rest.replace(/^\s+/, '');
    const link = consumeLink(rest, lineNo, col);
    rest = link.rest.replace(/^\s+/, '');

    const target = consumeNodeToken(rest, lineNo, col);
    upsertNode(nodes, target.node);
    rest = target.rest;

    edges.push({
      id: nextEdgeId(),
      from: prevId,
      to: target.node.id,
      type: link.type,
      ...(link.label !== undefined ? { label: link.label } : {}),
    });
    prevId = target.node.id;
  }
}

interface iConsumedNode {
  node: iNodeAcc;
  rest: string;
}

/** Consume a `id shape? class?` token from the head of `input`. */
function consumeNodeToken(input: string, lineNo: number, col: number): iConsumedNode {
  const s = input.replace(/^\s+/, '');
  const idMatch = ID_RE.exec(s);
  if (!idMatch) {
    throw new FlowchartParseError(`expected a node id, got "${s.slice(0, 12)}"`, lineNo, col);
  }
  const id = idMatch[0];
  let rest = s.slice(id.length);

  const acc: iNodeAcc = { id, explicit: false };

  if (rest.startsWith('([')) {
    const close = rest.indexOf('])');
    if (close === -1) throw new FlowchartParseError(`unclosed "([" for node "${id}"`, lineNo, col);
    acc.label = rest.slice(2, close).trim();
    acc.shape = 'stadium';
    rest = rest.slice(close + 2);
  } else if (rest.startsWith('[')) {
    const close = rest.indexOf(']');
    if (close === -1) throw new FlowchartParseError(`unclosed "[" for node "${id}"`, lineNo, col);
    acc.label = rest.slice(1, close).trim();
    acc.shape = 'action';
    rest = rest.slice(close + 1);
  } else if (rest.startsWith('{')) {
    const close = rest.indexOf('}');
    if (close === -1) throw new FlowchartParseError(`unclosed "{" for node "${id}"`, lineNo, col);
    acc.label = rest.slice(1, close).trim();
    acc.shape = 'decision';
    rest = rest.slice(close + 1);
  }

  if (rest.startsWith(':::')) {
    const clsMatch = /^:::([A-Za-z]+)/.exec(rest);
    if (!clsMatch) throw new FlowchartParseError(`malformed class on node "${id}"`, lineNo, col);
    const cls = clsMatch[1];
    if (!isNodeType(cls)) {
      throw new FlowchartParseError(`unknown node class ":::${cls}" on node "${id}"`, lineNo, col);
    }
    acc.type = cls;
    acc.explicit = true;
    rest = rest.slice(clsMatch[0].length);
  }

  return { node: acc, rest };
}

interface iConsumedLink {
  type: iEdgeType;
  label?: string;
  rest: string;
}

/** Consume a link glyph, optional `|label|`, and optional `:::edgeClass`. */
function consumeLink(input: string, lineNo: number, col: number): iConsumedLink {
  const s = input.replace(/^\s+/, '');
  const found = LINKS.find((l) => s.startsWith(l.glyph));
  if (!found) {
    throw new FlowchartParseError(
      `expected an edge ("-->", "-.->" or "==>"), got "${s.slice(0, 8)}"`,
      lineNo,
      col
    );
  }
  let rest = s.slice(found.glyph.length);
  let type = found.type;
  let label: string | undefined;

  if (rest.startsWith('|')) {
    const close = rest.indexOf('|', 1);
    if (close === -1) throw new FlowchartParseError('unclosed edge label "|"', lineNo, col);
    label = rest.slice(1, close).trim();
    rest = rest.slice(close + 1);
  }

  const trimmed = rest.replace(/^\s*/, '');
  if (trimmed.startsWith(':::')) {
    const clsMatch = /^:::([A-Za-z]+)/.exec(trimmed);
    if (!clsMatch) throw new FlowchartParseError('malformed edge class', lineNo, col);
    const cls = clsMatch[1];
    if (!isEdgeType(cls)) {
      throw new FlowchartParseError(`unknown edge class ":::${cls}"`, lineNo, col);
    }
    type = cls;
    rest = trimmed.slice(clsMatch[0].length);
  }

  return { type, label, rest };
}

/** Merge a freshly-parsed node token into the accumulator map (later info wins). */
function upsertNode(nodes: Map<string, iNodeAcc>, incoming: iNodeAcc): void {
  const existing = nodes.get(incoming.id);
  if (!existing) {
    nodes.set(incoming.id, incoming);
    return;
  }
  if (incoming.label !== undefined) existing.label = incoming.label;
  if (incoming.shape !== undefined) existing.shape = incoming.shape;
  if (incoming.explicit) {
    existing.type = incoming.type;
    existing.explicit = true;
  }
}

/** Second pass: turn accumulated node records into typed iFlowNode[]. */
function resolveNodeTypes(nodes: Map<string, iNodeAcc>, edges: iFlowEdge[]): iFlowNode[] {
  const incoming = new Set<string>();
  const outgoing = new Set<string>();
  for (const e of edges) {
    incoming.add(e.to);
    outgoing.add(e.from);
  }

  const list = [...nodes.values()];

  for (const n of list) {
    if (n.explicit && n.type) continue;
    if (n.shape === 'decision') n.type = 'decision';
    else if (n.shape === 'stadium') n.type = undefined;
    else n.type = 'action';
  }

  for (const n of list) {
    if (n.explicit) continue;
    if (n.shape === 'stadium') {
      if (!incoming.has(n.id)) n.type = 'start';
      else if (!outgoing.has(n.id)) n.type = 'end';
      else n.type = 'action';
    }
  }

  if (!list.some((n) => n.type === 'start')) {
    const entries = list.filter((n) => !n.explicit && n.type === 'action' && !incoming.has(n.id));
    if (entries.length > 0) entries.forEach((n) => (n.type = 'start'));
    else if (list.length > 0 && !list[0].explicit) list[0].type = 'start';
  }

  if (!list.some((n) => n.type === 'end')) {
    const terminals = list.filter(
      (n) => !n.explicit && n.type === 'action' && !outgoing.has(n.id)
    );
    terminals.forEach((n) => (n.type = 'end'));
  }

  // The DSL does not express `description` (that is set via the graph object API), so
  // resolved nodes carry only id/label/type.
  return list.map((n) => ({
    id: n.id,
    label: n.label ?? n.id,
    // Resolution above always assigns a type (action is the floor).
    type: n.type as iFlowNode['type'],
  }));
}
