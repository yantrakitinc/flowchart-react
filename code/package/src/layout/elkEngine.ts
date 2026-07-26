import type { iDirection, iFlowGraph } from '../ir/types';
import type { iEngineContext, iLayoutEngine, iPositions } from './types';

/** Minimal shape of the `elkjs` instance this engine depends on. */
interface iElkInstance {
  layout(graph: unknown): Promise<{ children?: Array<{ id: string; x?: number; y?: number }> }>;
}

/** Minimal shape of the `elkjs/lib/elk.bundled.js` module. */
interface iElkModule {
  default: new () => iElkInstance;
}

/**
 * Loads and instantiates `elkjs`. `elkjs` is an optional peer dependency — this
 * throws a clear, actionable error if it is not installed, instead of letting a
 * bare "module not found" bubble up. The `importer` param exists so tests can
 * inject a stub/failing loader without needing the real package installed.
 */
export async function loadElk(
  importer: () => Promise<iElkModule> = () =>
    import('elkjs/lib/elk.bundled.js') as unknown as Promise<iElkModule>
): Promise<iElkInstance> {
  let mod: iElkModule;
  try {
    mod = await importer();
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    throw new Error(
      `The elk layout engine requires the optional peer dependency "elkjs". Install it with \`pnpm add elkjs\`. (${reason})`
    );
  }
  const ElkCtor = mod.default;
  return new ElkCtor();
}

/** Maps our {@link iDirection} vocabulary onto ELK's `elk.direction` vocabulary. */
const ELK_DIRECTION_BY_DIRECTION: Record<iDirection, string> = {
  TD: 'DOWN',
  BT: 'UP',
  LR: 'RIGHT',
  RL: 'LEFT',
};

function elkDirectionFor(direction: iDirection): string {
  return ELK_DIRECTION_BY_DIRECTION[direction];
}

/**
 * Opt-in layout engine backed by `elkjs`'s layered algorithm. Pass `{ engine: elkEngine }`
 * to {@link layout} to use it in place of the default dagre engine.
 */
export const elkEngine: iLayoutEngine = {
  name: 'elk',
  async run(graph: iFlowGraph, ctx: iEngineContext): Promise<iPositions> {
    const elk = await loadElk();
    const nodeIds = new Set(graph.nodes.map((n) => n.id));

    const elkGraph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': elkDirectionFor(ctx.direction),
        'elk.spacing.nodeNode': String(ctx.nodeSpacing),
        'elk.layered.spacing.nodeNodeBetweenLayers': String(ctx.rankSpacing),
      },
      children: graph.nodes.map((n) => ({ id: n.id, width: ctx.nodeWidth, height: ctx.nodeHeight })),
      edges: graph.edges
        .filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to))
        .map((e) => ({ id: e.id, sources: [e.from], targets: [e.to] })),
    };

    const result = await elk.layout(elkGraph);
    const positions: iPositions = new Map();
    for (const child of result.children ?? []) {
      positions.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
    }
    return positions;
  },
};
