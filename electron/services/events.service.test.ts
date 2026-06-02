// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

// db.ts reads HOME at module load to compute the DB path, so HOME must be set
// before the module is imported. Do it eagerly, before the dynamic imports below.
const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cam-events-'));
const prevHome = process.env.HOME;
process.env.HOME = tmpHome;

// Mock broadcast so ingestEvent does not require a BrowserWindow.
vi.mock('./broadcast', () => ({ broadcast: vi.fn() }));

const { initDb, getDb } = await import('./db');
const { ingestEvent } = await import('./events.service');

beforeAll(async () => {
  await initDb();
});

afterAll(() => {
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

function modelFor(sessionId: string): unknown {
  return getDb()
    .prepare('SELECT model FROM events WHERE session_id = ?')
    .get(sessionId)?.model;
}

describe('events.service ingestEvent', () => {
  it('persists the model column when a model is provided', () => {
    ingestEvent({
      agent_name: 'tester',
      session_id: 's-model',
      event_type: 'Usage',
      tokens_in: 10,
      tokens_out: 20,
      model: 'claude-opus-4',
    });

    expect(modelFor('s-model')).toBe('claude-opus-4');
  });

  it('stores null model when none is provided', () => {
    ingestEvent({
      agent_name: 'tester',
      session_id: 's-nomodel',
      event_type: 'PreToolUse',
      tool_name: 'Bash',
    });

    expect(modelFor('s-nomodel')).toBeNull();
  });
});
