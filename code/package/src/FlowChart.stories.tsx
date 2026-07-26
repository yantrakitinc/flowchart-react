import type { Meta, StoryObj } from '@storybook/react';
import { useState, type CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FlowChart } from './react/FlowChart';
import { elkEngine } from './layout/elkEngine';
import type { iFlowGraph } from './ir/types';
import type { iFlowNodeData } from './react/types';

const meta: Meta<typeof FlowChart> = {
  title: 'FlowChart/FlowChart',
  component: FlowChart,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Author a diagram as Mermaid-like `chart` text or a `graph` object; it renders on ' +
          'React Flow with auto-layout, interactive nodes, semantic path detection, and a ' +
          '"movie mode" that plays a path node-by-node.',
      },
    },
  },
  argTypes: {
    pathDrawerPosition: { control: 'select', options: ['top', 'bottom', 'left', 'right'] },
    direction: { control: 'select', options: ['TD', 'BT', 'LR', 'RL'] },
    // Log every callback to the Storybook "Actions" tab so you can watch them fire.
    onNodeClick: { action: 'onNodeClick' },
    onPathChange: { action: 'onPathChange' },
    onPlaybackStep: { action: 'onPlaybackStep' },
    onPlaybackEnd: { action: 'onPlaybackEnd' },
  },
};
export default meta;

type Story = StoryObj<typeof FlowChart>;
const doc = (story: string) => ({ parameters: { docs: { description: { story } } } });

const CHECKOUT = `flowchart TD
  start([Order placed]) --> cart[Review cart]
  cart --> pay{Payment OK?}
  pay -->|yes| ship[Ship order]
  pay ==>|no| fail[Payment failed]:::error
  pay -.->|review| hold[Manual review]:::warning
  ship --> done([Delivered])
  fail --> done
  hold --> ship`;

/** The headline feature — diagram-as-code. Edit the text in Controls to re-render. */
export const AuthorWithText: Story = {
  args: { chart: CHECKOUT, height: 560 },
  ...doc('Write a Mermaid-like string; positions + the red error / dotted warning paths are computed for you.'),
};

const SIGNUP: iFlowGraph = {
  id: 'signup',
  name: 'Signup',
  direction: 'TD',
  nodes: [
    { id: 's', label: 'Visitor', type: 'start' },
    { id: 'form', label: 'Fill form', type: 'action', description: 'Email + password' },
    { id: 'v', label: 'Valid?', type: 'decision' },
    { id: 'ok', label: 'Create account', type: 'action' },
    { id: 'err', label: 'Show errors', type: 'error' },
    { id: 'e', label: 'Dashboard', type: 'end' },
  ],
  edges: [
    { id: 'e0', from: 's', to: 'form', type: 'default' },
    { id: 'e1', from: 'form', to: 'v', type: 'default' },
    { id: 'e2', from: 'v', to: 'ok', type: 'happy', label: 'yes' },
    { id: 'e3', from: 'v', to: 'err', type: 'error', label: 'no' },
    { id: 'e4', from: 'ok', to: 'e', type: 'happy' },
    { id: 'e5', from: 'err', to: 'form', type: 'warning' },
  ],
};

/** Author with the IR object; supports a per-node `description` (click the node's “+”). */
export const AuthorWithObject: Story = {
  args: { graph: SIGNUP, height: 560, showMiniMap: true },
  ...doc('Same renderer, object input — the exact shape `parseFlowchart` produces.'),
};

/** Direction via the header or the `direction` prop; handles re-orient automatically. */
export const LeftToRight: Story = {
  args: {
    height: 360,
    chart: `flowchart LR
  a([Commit]) --> b[Install] --> c[Test] --> d{Pass?}
  d -->|yes| e([Deploy])
  d ==>|no| a`,
  },
  ...doc('A CI pipeline laid out left-to-right.'),
};

/** dagre is default; opt into ELK for denser graphs with `layoutEngine={elkEngine}`. */
export const ElkLayoutEngine: Story = {
  args: { chart: CHECKOUT, layoutEngine: elkEngine, height: 560 },
  ...doc('Same diagram via ELK instead of dagre — compare the edge routing.'),
};

/** Detected start→end paths, colored by semantics; click one in the drawer to isolate it. */
export const PathDetection: Story = {
  args: { chart: CHECKOUT, height: 560, pathDrawerPosition: 'right' },
  ...doc('The path drawer lists happy/warning/error routes; selecting one dims the rest.'),
};

/** Per-node click → your screen. `onNodeClick(id, data)` fires on every node. */
export const ClickNodeForScreen: Story = {
  render: (args) => {
    const [screen, setScreen] = useState<string>('(click a node)');
    return (
      <div style={{ display: 'flex', gap: 12, padding: 12 }}>
        <div style={{ flex: 1 }}>
          <FlowChart {...args} onNodeClick={(id, d) => setScreen(`${d.type} — ${d.label} (#${id})`)} />
        </div>
        <div
          style={{
            width: 240,
            border: '1px solid #e4e4e7',
            borderRadius: 12,
            padding: 16,
            fontFamily: 'system-ui',
          }}
        >
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#a1a1aa' }}>Screen for node</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 6 }}>{screen}</div>
          <p style={{ fontSize: 12, color: '#71717a', marginTop: 12 }}>
            Wire a real screenshot/route here off <code>onNodeClick</code>.
          </p>
        </div>
      </div>
    );
  },
  args: { chart: CHECKOUT, height: 520, showPathDrawer: false },
  ...doc('Associate a screen with each node: click a node → show its UI state on the side.'),
};

/**
 * MOVIE MODE — `autoPlay` walks a path node-by-node. `onPlaybackStep(nodeId, index, data)`
 * fires on each step, so the panel on the right swaps to that node's "screen" as the path
 * plays. Plays the selected path, or the first detected path when none is selected.
 */
export const MovieMode: Story = {
  render: (args) => {
    const [step, setStep] = useState<{ id: string; i: number; label: string } | null>(null);
    return (
      <div style={{ display: 'flex', gap: 12, padding: 12 }}>
        <div style={{ flex: 1 }}>
          <FlowChart
            {...args}
            onPlaybackStep={(id, i, d) => setStep({ id, i, label: d.label })}
          />
        </div>
        <div
          style={{
            width: 260,
            border: '2px solid #6366f1',
            borderRadius: 12,
            padding: 16,
            fontFamily: 'system-ui',
            background: 'linear-gradient(180deg,#eef2ff,#fff)',
          }}
        >
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#6366f1', fontWeight: 700 }}>
            Now playing — step {step ? step.i + 1 : 0}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>
            {step ? step.label : 'Press play ▶'}
          </div>
          <p style={{ fontSize: 12, color: '#52525b', marginTop: 12 }}>
            This panel updates from <code>onPlaybackStep</code> — swap in the screenshot for the
            current node here.
          </p>
        </div>
      </div>
    );
  },
  args: { chart: CHECKOUT, height: 520, autoPlay: true, playbackSpeedMs: 1400, loop: true },
  ...doc('Auto-plays the first path; the side panel shows each node’s screen as it advances.'),
};

/** A custom node component supplied via the `nodeTypes` registry. */
function KpiNode({ data }: NodeProps): JSX.Element {
  const d = data as iFlowNodeData & { metric?: string };
  return (
    <div style={{ border: '2px solid #6366f1', borderRadius: 12, padding: '10px 14px', background: '#fff', textAlign: 'center', fontFamily: 'system-ui', minWidth: 130 }}>
      <Handle type="target" position={Position.Left} />
      <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 700 }}>{d.label}</div>
      {d.metric && <div style={{ fontSize: 22, fontWeight: 800 }}>{d.metric}</div>}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const KPI: iFlowGraph = {
  id: 'kpi', name: 'KPIs', direction: 'LR',
  nodes: [
    { id: 'v', label: 'Visits', type: 'action', data: { metric: '12.4k' } },
    { id: 's', label: 'Signups', type: 'action', data: { metric: '1.1k' } },
    { id: 'p', label: 'Paid', type: 'action', data: { metric: '218' } },
  ],
  edges: [
    { id: 'e0', from: 'v', to: 's', type: 'happy' },
    { id: 'e1', from: 's', to: 'p', type: 'happy' },
  ],
};

/** Replace any node type with your own component via `nodeTypes`; `data.data` flows through. */
export const CustomNodeComponents: Story = {
  args: { graph: KPI, height: 320, nodeTypes: { action: KpiNode }, showPathDrawer: false },
  ...doc('The `action` type rendered as a bespoke KPI card — your component, our layout + edges.'),
};

/** All colors are CSS variables (`--fc-*`) — theme with pure CSS, no props. */
export const ThemingWithTokens: Story = {
  render: (args) => (
    <div
      style={{
        '--fc-node-bg': '#1e1b2e', '--fc-node-text': '#e9e7f5', '--fc-node-action': '#8b5cf6',
        '--fc-node-start': '#22d3ee', '--fc-node-end': '#34d399', '--fc-node-decision': '#fbbf24',
        '--fc-drawer-bg': '#17141f', '--fc-drawer-text': '#e9e7f5', '--fc-drawer-border': '#3b3550',
        background: '#0f0d17', padding: 12,
      } as CSSProperties}
    >
      <FlowChart {...args} />
    </div>
  ),
  args: { chart: CHECKOUT, height: 520 },
  ...doc('A dark theme applied by overriding the `--fc-*` variables on a wrapper.'),
};

/** Malformed text renders an inline error box, never a crash. */
export const ParseErrorHandling: Story = {
  args: { chart: 'missing a header --> nowhere', height: 220, showPathDrawer: false },
  ...doc('No `flowchart <DIR>` header → a friendly error box with the exact reason.'),
};
