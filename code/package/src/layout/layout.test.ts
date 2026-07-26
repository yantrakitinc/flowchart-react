import { describe, it, expect } from 'vitest';
import { layout } from './layout';
import { dagreEngine } from './dagreEngine';
import { elkEngine } from './elkEngine';
import { parseFlowchart } from '../parse/parseFlowchart';

const linear = () => parseFlowchart('flowchart TD\n  a --> b --> c');

describe('layout (dagre default)', () => {
  it('positions every node', async () => {
    const { nodes } = await layout(linear());
    expect(nodes).toHaveLength(3);
    nodes.forEach((n) => {
      expect(Number.isFinite(n.position.x)).toBe(true);
      expect(Number.isFinite(n.position.y)).toBe(true);
    });
  });
  it('maps edges to source/target render shape', async () => {
    expect((await layout(linear())).edges[0]).toMatchObject({ source: 'a', target: 'b', type: 'default' });
  });
  it('stacks nodes vertically for TD', async () => {
    const byId = Object.fromEntries((await layout(linear())).nodes.map((n) => [n.id, n.position]));
    expect(byId.b.y).toBeGreaterThan(byId.a.y);
    expect(byId.c.y).toBeGreaterThan(byId.b.y);
  });
  it('spreads nodes horizontally for LR', async () => {
    const g = parseFlowchart('flowchart LR\n  a --> b --> c');
    const byId = Object.fromEntries((await layout(g)).nodes.map((n) => [n.id, n.position]));
    expect(byId.b.x).toBeGreaterThan(byId.a.x);
    expect(byId.c.x).toBeGreaterThan(byId.b.x);
  });
  it('honors BT and RL directions without error', async () => {
    expect((await layout(parseFlowchart('flowchart BT\n a --> b'))).nodes).toHaveLength(2);
    expect((await layout(parseFlowchart('flowchart RL\n a --> b'))).nodes).toHaveLength(2);
  });
  it('respects explicit spacing options', async () => {
    const { nodes } = await layout(linear(), { nodeWidth: 200, nodeHeight: 80, rankSpacing: 120, nodeSpacing: 60 });
    expect(nodes[0].width).toBe(200);
    expect(nodes[0].height).toBe(80);
  });
  it('carries node description + data through to the positioned node', async () => {
    const g = parseFlowchart('flowchart TD\n a --> b');
    g.nodes[0].description = 'hi';
    g.nodes[0].data = { k: 1 };
    const { nodes } = await layout(g);
    const a = nodes.find((n) => n.id === 'a');
    expect(a?.description).toBe('hi');
    expect(a?.data).toEqual({ k: 1 });
  });
  it('exposes the engine name', () => {
    expect(dagreEngine.name).toBe('dagre');
  });
});

describe('layout — missing positions', () => {
  it('defaults a node position to (0,0) when the engine omits it', async () => {
    const emptyEngine = { name: 'empty', run: () => Promise.resolve(new Map()) };
    const { nodes } = await layout(linear(), { engine: emptyEngine });
    expect(nodes.every((n) => n.position.x === 0 && n.position.y === 0)).toBe(true);
  });
});

describe('layout (ELK opt-in)', () => {
  it('positions every node via the elk engine', async () => {
    const { nodes } = await layout(linear(), { engine: elkEngine });
    expect(nodes).toHaveLength(3);
    nodes.forEach((n) => expect(Number.isFinite(n.position.x)).toBe(true));
  });
  it('exposes the engine name', () => {
    expect(elkEngine.name).toBe('elk');
  });
});
