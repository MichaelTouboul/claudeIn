// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

// db.ts reads HOME at module load to compute the DB path, so HOME must be set
// before the module is imported. Do it eagerly, before the dynamic imports below.
const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cam-costs-'));
const prevHome = process.env.HOME;
process.env.HOME = tmpHome;

// Mock broadcast so ingestEvent does not require a BrowserWindow.
vi.mock('./broadcast', () => ({ broadcast: vi.fn() }));

const { initDb } = await import('./db');
const { ingestEvent } = await import('./events.service');
const { getCostsByModel } = await import('./costs.service');

beforeAll(async () => {
  await initDb();

  // Two events on opus, one on sonnet, one with no model (→ 'unknown').
  ingestEvent({
    agent_name: 'a',
    event_type: 'Usage',
    tokens_in: 100,
    tokens_out: 50,
    cost_usd: 1,
    model: 'claude-opus-4',
  });
  ingestEvent({
    agent_name: 'a',
    event_type: 'Usage',
    tokens_in: 200,
    tokens_out: 80,
    cost_usd: 2,
    model: 'claude-opus-4',
  });
  ingestEvent({
    agent_name: 'b',
    event_type: 'Usage',
    tokens_in: 10,
    tokens_out: 5,
    cost_usd: 0.5,
    model: 'claude-sonnet-4',
  });
  ingestEvent({
    agent_name: 'b',
    event_type: 'Usage',
    tokens_in: 30,
    tokens_out: 10,
    cost_usd: 0.1,
  });
});

afterAll(() => {
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

interface ModelRow {
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  events_count: number;
}

describe('costs.service getCostsByModel', () => {
  it('groups by model, sums tokens/cost, counts events, and orders by cost desc', () => {
    const rows = getCostsByModel() as unknown as ModelRow[];
    const byModel = Object.fromEntries(rows.map((r) => [r.model, r]));

    // opus: 2 events, summed tokens/cost.
    expect(byModel['claude-opus-4']).toMatchObject({
      tokens_in: 300,
      tokens_out: 130,
      cost_usd: 3,
      events_count: 2,
    });

    // sonnet: 1 event.
    expect(byModel['claude-sonnet-4']).toMatchObject({
      tokens_in: 10,
      tokens_out: 5,
      cost_usd: 0.5,
      events_count: 1,
    });

    // null model coalesces to 'unknown'.
    expect(byModel['unknown']).toMatchObject({
      tokens_in: 30,
      tokens_out: 10,
      events_count: 1,
    });

    // Ordered by cost_usd descending: opus (3) > sonnet (0.5) > unknown (0.1).
    expect(rows.map((r) => r.model)).toEqual([
      'claude-opus-4',
      'claude-sonnet-4',
      'unknown',
    ]);
  });
});
