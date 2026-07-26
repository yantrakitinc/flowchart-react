import type { iDirection, iEdgeType, iFlowEdge, iFlowGraph, iFlowNode, iNodeType } from '../ir/types';
import { isDirection, isEdgeType, isNodeType } from '../ir/types';
import { FlowchartParseError } from './errors';

/** Options accepted by {@link parseFlowchart}. */
export interface iParseOptions {
  /** Direction to use when the DSL text has no `flowchart <DIR>` header line. */
  direction?: iDirection;
  /** Id assigned to the resulting graph. Defaults to `'flowchart'`. */
  id?: string;
  /** Name assigned to the resulting graph. Defaults to `'Flowchart'`. */
  name?: string;
}

/** A node shape as written in the DSL, prior to final type resolution. */
type iShape = 'action' | 'decision' | 'stadium';

/** Working draft of a node while a DSL document is being parsed. */
interface iNodeDraft {
  id: string;
  label: string;
  shape?: iShape;
  explicitType?: iNodeType;
  type: iNodeType;
}

/** Mutable cursor over a single DSL line, used by the chain-statement parser. */
interface iCursor {
  line: string;
  lineNo: number;
  pos: number;
}

const NODE_ID_RE = /^[A-Za-z0-9_]+/;
const EDGE_GLYPH_RE = /^(-\.->|-->|==>)/;
const HEADER_RE = /^(flowchart|graph)(?:\s+(\S+))?\s*$/;

const EDGE_TYPE_BY_GLYPH: Record<string, iEdgeType> = {
  '-->': 'default',
  '-.->': 'warning',
  '==>': 'error',
};

function skipWhitespace(cursor: iCursor): void {
  while (cursor.pos < cursor.line.length && /\s/.test(cursor.line[cursor.pos])) {
    cursor.pos += 1;
  }
}

function stripComment(rawLine: string): string {
  const idx = rawLine.indexOf('%%');
  return idx === -1 ? rawLine : rawLine.slice(0, idx);
}

function normalizeDirection(token: string, lineNo: number): iDirection {
  const upper = token.toUpperCase();
  const normalized = upper === 'TB' ? 'TD' : upper;
  if (!isDirection(normalized)) {
    throw new FlowchartParseError(`unknown direction '${token}'`, lineNo);
  }
  return normalized;
}

/** Parses an explicit `:::identifier` class tag starting at the cursor, if present. */
function parseExplicitClass(cursor: iCursor): string | undefined {
  if (!cursor.line.startsWith(':::', cursor.pos)) return undefined;
  const rest = cursor.line.slice(cursor.pos + 3);
  const match = /^[A-Za-z]+/.exec(rest);
  if (!match) {
    throw new FlowchartParseError('malformed ::: class annotation', cursor.lineNo, cursor.pos + 1);
  }
  cursor.pos += 3 + match[0].length;
  return match[0];
}

/** Parses an optional node shape (`[..]`, `{..}`, `([..])`) starting at the cursor. */
function parseShape(cursor: iCursor): { shape: iShape; label: string } | undefined {
  const { line } = cursor;
  if (line.startsWith('([', cursor.pos)) {
    const close = line.indexOf('])', cursor.pos + 2);
    if (close === -1) {
      throw new FlowchartParseError('unclosed stadium bracket "(["', cursor.lineNo, cursor.pos + 1);
    }
    const label = line.slice(cursor.pos + 2, close);
    cursor.pos = close + 2;
    return { shape: 'stadium', label };
  }
  if (line[cursor.pos] === '[') {
    const close = line.indexOf(']', cursor.pos + 1);
    if (close === -1) {
      throw new FlowchartParseError('unclosed bracket "["', cursor.lineNo, cursor.pos + 1);
    }
    const label = line.slice(cursor.pos + 1, close);
    cursor.pos = close + 1;
    return { shape: 'action', label };
  }
  if (line[cursor.pos] === '{') {
    const close = line.indexOf('}', cursor.pos + 1);
    if (close === -1) {
      throw new FlowchartParseError('unclosed brace "{"', cursor.lineNo, cursor.pos + 1);
    }
    const label = line.slice(cursor.pos + 1, close);
    cursor.pos = close + 1;
    return { shape: 'decision', label };
  }
  return undefined;
}

/** Parses a node-id token, optional shape and optional explicit class at the cursor. */
function parseNodeToken(
  cursor: iCursor,
  drafts: Map<string, iNodeDraft>,
  order: string[]
): iNodeDraft {
  skipWhitespace(cursor);
  const match = NODE_ID_RE.exec(cursor.line.slice(cursor.pos));
  if (!match) {
    throw new FlowchartParseError('expected a node id', cursor.lineNo, cursor.pos + 1);
  }
  const id = match[0];
  cursor.pos += id.length;

  const shape = parseShape(cursor);
  const explicitClass = parseExplicitClass(cursor);
  let explicitType: iNodeType | undefined;
  if (explicitClass !== undefined) {
    if (!isNodeType(explicitClass)) {
      throw new FlowchartParseError(`unknown node class '${explicitClass}'`, cursor.lineNo, cursor.pos + 1);
    }
    explicitType = explicitClass;
  }

  let draft = drafts.get(id);
  if (!draft) {
    draft = { id, label: id, type: 'action' };
    drafts.set(id, draft);
    order.push(id);
  }
  if (shape) {
    draft.shape = shape.shape;
    draft.label = shape.label;
  }
  if (explicitType) {
    draft.explicitType = explicitType;
  }
  return draft;
}

/** Parses one full chain statement line (`A --> B{C} --> D`) into node/edge drafts. */
function parseChainLine(
  cursor: iCursor,
  drafts: Map<string, iNodeDraft>,
  order: string[],
  edges: iFlowEdge[],
  edgeCounter: { value: number }
): void {
  let previous = parseNodeToken(cursor, drafts, order);

  for (;;) {
    skipWhitespace(cursor);
    if (cursor.pos >= cursor.line.length) return;

    const glyphMatch = EDGE_GLYPH_RE.exec(cursor.line.slice(cursor.pos));
    if (!glyphMatch) {
      throw new FlowchartParseError('expected an edge glyph (-->, -.->,  ==>)', cursor.lineNo, cursor.pos + 1);
    }
    const glyph = glyphMatch[0];
    cursor.pos += glyph.length;
    let edgeType = EDGE_TYPE_BY_GLYPH[glyph];

    skipWhitespace(cursor);
    let label: string | undefined;
    if (cursor.line[cursor.pos] === '|') {
      const close = cursor.line.indexOf('|', cursor.pos + 1);
      if (close === -1) {
        throw new FlowchartParseError('unclosed edge label "|"', cursor.lineNo, cursor.pos + 1);
      }
      label = cursor.line.slice(cursor.pos + 1, close);
      cursor.pos = close + 1;
    }

    skipWhitespace(cursor);
    const edgeClass = parseExplicitClass(cursor);
    if (edgeClass !== undefined) {
      if (!isEdgeType(edgeClass)) {
        throw new FlowchartParseError(`unknown edge class '${edgeClass}'`, cursor.lineNo, cursor.pos + 1);
      }
      edgeType = edgeClass;
    }

    const next = parseNodeToken(cursor, drafts, order);
    edges.push({
      id: `e${edgeCounter.value}`,
      from: previous.id,
      to: next.id,
      type: edgeType,
      ...(label !== undefined ? { label } : {}),
    });
    edgeCounter.value += 1;
    previous = next;
  }
}

/** Resolves final {@link iNodeType} for every draft, given explicit class > shape > position. */
function resolveNodeTypes(drafts: Map<string, iNodeDraft>, order: string[], edges: iFlowEdge[]): void {
  const hasIncoming = new Set(edges.map((e) => e.to));
  const hasOutgoing = new Set(edges.map((e) => e.from));

  for (const id of order) {
    const draft = drafts.get(id)!;
    if (draft.explicitType) {
      draft.type = draft.explicitType;
      continue;
    }
    if (draft.shape === 'decision') {
      draft.type = 'decision';
      continue;
    }
    if (draft.shape === 'action') {
      draft.type = 'action';
      continue;
    }
    // stadium shape, or bare id with no shape: resolve by position.
    if (!hasIncoming.has(id)) {
      draft.type = 'start';
    } else if (!hasOutgoing.has(id)) {
      draft.type = 'end';
    } else {
      draft.type = 'action';
    }
  }

  if (!order.some((id) => drafts.get(id)!.type === 'start')) {
    const entryActions = order
      .map((id) => drafts.get(id)!)
      .filter((d) => d.type === 'action' && !hasIncoming.has(d.id));
    if (entryActions.length > 0) {
      for (const draft of entryActions) draft.type = 'start';
    } else {
      const firstNonExplicit = order.map((id) => drafts.get(id)!).find((d) => !d.explicitType);
      if (firstNonExplicit) firstNonExplicit.type = 'start';
    }
  }

  if (!order.some((id) => drafts.get(id)!.type === 'end')) {
    const terminalActions = order
      .map((id) => drafts.get(id)!)
      .filter((d) => d.type === 'action' && !hasOutgoing.has(d.id));
    for (const draft of terminalActions) draft.type = 'end';
  }
}

/**
 * Parses Mermaid-like flowchart DSL text into a renderer-agnostic {@link iFlowGraph}.
 *
 * @throws {FlowchartParseError} on any malformed input; the error carries a 1-based
 * `line` (and best-effort `column`) pointing at the offending source text.
 */
export function parseFlowchart(text: string, options: iParseOptions = {}): iFlowGraph {
  const rawLines = text.split('\n');
  const drafts = new Map<string, iNodeDraft>();
  const order: string[] = [];
  const edges: iFlowEdge[] = [];
  const edgeCounter = { value: 0 };

  let direction: iDirection | undefined = options.direction;
  let headerConsumedAt = -1;

  for (let i = 0; i < rawLines.length; i += 1) {
    const lineNo = i + 1;
    const stripped = stripComment(rawLines[i]).trim();
    if (stripped.length === 0) continue;

    const headerMatch = HEADER_RE.exec(stripped);
    if (headerMatch && headerConsumedAt === -1 && drafts.size === 0 && edges.length === 0) {
      const directionToken = headerMatch[2];
      if (!directionToken) {
        throw new FlowchartParseError('missing direction', lineNo);
      }
      direction = normalizeDirection(directionToken, lineNo);
      headerConsumedAt = lineNo;
      continue;
    }

    if (headerConsumedAt === -1 && direction === undefined) {
      throw new FlowchartParseError('missing header (expected "flowchart <DIR>")', lineNo);
    }

    const cursor: iCursor = { line: stripped, lineNo, pos: 0 };
    parseChainLine(cursor, drafts, order, edges, edgeCounter);
  }

  if (order.length === 0) {
    // `text.split('\n')` always yields at least one entry (even for `''`), so
    // `rawLines.length` is always >= 1 here.
    throw new FlowchartParseError('empty diagram', rawLines.length);
  }
  // Unreachable with `direction === undefined`: the loop above throws "missing header"
  // on the first non-blank line whenever no header has been seen and no option was given,
  // and an all-blank/all-comment document is caught by the "empty diagram" check above.
  const resolvedDirection = direction as iDirection;

  resolveNodeTypes(drafts, order, edges);

  const nodes: iFlowNode[] = order.map((id) => {
    const draft = drafts.get(id)!;
    return { id: draft.id, label: draft.label, type: draft.type };
  });

  return {
    id: options.id ?? 'flowchart',
    name: options.name ?? 'Flowchart',
    direction: resolvedDirection,
    nodes,
    edges,
  };
}
