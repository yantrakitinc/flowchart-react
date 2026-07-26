/**
 * Opt-in layout engine backed by ELK (elkjs). elkjs is an OPTIONAL dependency — dynamically
 * imported so the default bundle never pulls it in. Consumers who pass this engine must have
 * `elkjs` installed; otherwise a clear error is thrown.
 */
import { iDirection, iFlowGraph } from '../ir/types';
import { iEngineContext, iLayoutEngine, iPositions } from './types';

/** Map our direction to ELK's `elk.direction`. */
function elkDirection(direction: iDirection): string {
  switch (direction) {
    case 'TD':
      return 'DOWN';
    case 'BT':
      return 'UP';
    case 'LR':
      return 'RIGHT';
    case 'RL':
      return 'LEFT';
  }
}

interface iElkNode {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  children?: iElkNode[];
  edges?: { id: string; sources: string[]; targets: string[] }[];
  layoutOptions?: Record<string, string>;
}
interface iElkInstance {
  layout(graph: iElkNode): Promise<iElkNode>;
}
type iElkCtor = new () => iElkInstance;

/** Default dynamic importer for elkjs (overridable for testing). */
const defaultImporter = (): Promise<{ default: iElkCtor }> =>
  import('elkjs/lib/elk.bundled.js') as unknown as Promise<{ default: iElkCtor }>;

/** Load the ELK constructor, throwing a clear error when elkjs is not installed. */
export async function loadElk(
  importer: () => Promise<{ default: iElkCtor }> = defaultImporter
): Promise<iElkCtor> {
  try {
    return (await importer()).default;
  } catch {
    throw new Error(
      "elkEngine requires the optional peer dependency 'elkjs'. Install it with `pnpm add elkjs`."
    );
  }
}

/** ELK-backed layout strategy (opt-in). */
export const elkEngine: iLayoutEngine = {
  name: 'elk',
  async run(graph: iFlowGraph, ctx: iEngineContext): Promise<iPositions> {
    const ELK = await loadElk();
    const elk = new ELK();

    const laidOut = await elk.layout({
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': elkDirection(ctx.direction),
        'elk.layered.spacing.nodeNodeBetweenLayers': String(ctx.rankSpacing),
        'elk.spacing.nodeNode': String(ctx.nodeSpacing),
      },
      children: graph.nodes.map((n) => ({ id: n.id, width: ctx.nodeWidth, height: ctx.nodeHeight })),
      edges: graph.edges
        .filter(
          (e) => graph.nodes.some((n) => n.id === e.from) && graph.nodes.some((n) => n.id === e.to)
        )
        .map((e) => ({ id: e.id, sources: [e.from], targets: [e.to] })),
    });

    const positions: iPositions = new Map();
    // ELK returns a `children` array with x/y assigned for every input node.
    for (const child of laidOut.children as iElkNode[]) {
      positions.set(child.id, { x: child.x as number, y: child.y as number });
    }
    // Any node ELK omitted is defaulted by layout() (positions.get(id) ?? {0,0}).
    return positions;
  },
};
