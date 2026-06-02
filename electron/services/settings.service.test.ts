// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Mock broadcast so the live-change test observes the push without a BrowserWindow.
vi.mock('./broadcast', () => ({ broadcast: vi.fn() }));

import { broadcast } from './broadcast';
import { getSettings, unwatchSettings, watchSettings } from './settings.service';
import type { SettingsSnapshot } from '../types/settings.types';

const broadcastMock = vi.mocked(broadcast);

let tmpHome: string;
let prevHome: string | undefined;

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cam-settings-'));
  prevHome = process.env.HOME;
  process.env.HOME = tmpHome;
  fs.mkdirSync(path.join(tmpHome, '.claude'), { recursive: true });
  broadcastMock.mockClear();
});

afterEach(() => {
  unwatchSettings(); // always tear down watchers/timers to avoid leaks
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

function writeUser(json: string) {
  fs.writeFileSync(path.join(tmpHome, '.claude', 'settings.json'), json);
}

function waitFor(predicate: () => boolean, timeout = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (predicate()) return resolve();
      if (Date.now() - start > timeout) return reject(new Error('timeout'));
      setTimeout(tick, 20);
    };
    tick();
  });
}

describe('settings.service getSettings', () => {
  it('returns layers in precedence order; missing files are exists:false/data:null', () => {
    const snap = getSettings();
    const sources = snap.layers.map((l) => l.source);
    // No project scope → user (lowest), then managed (highest). 4-layer model.
    expect(sources).toEqual(['user', 'managed']);
    const userLayer = snap.layers.find((l) => l.source === 'user');
    expect(userLayer?.exists).toBe(false);
    expect(userLayer?.data).toBeNull();
  });

  it('reads valid user settings into effective + provenance', () => {
    writeUser(JSON.stringify({ model: 'sonnet' }));
    const snap = getSettings();
    expect(snap.effective.model).toBe('sonnet');
    expect(snap.provenance.model).toEqual(['user']);
  });

  it('malformed JSON → exists:true, data:null, error set, and the merge skips it', () => {
    writeUser('{ not valid json');
    const snap = getSettings();
    const userLayer = snap.layers.find((l) => l.source === 'user');
    expect(userLayer?.exists).toBe(true);
    expect(userLayer?.data).toBeNull();
    expect(userLayer?.error).toBeTruthy();
    expect(snap.effective.model).toBeUndefined();
  });

  it('project scope adds project + projectLocal between user and managed; project overrides absent user', () => {
    const projDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cam-proj-'));
    fs.mkdirSync(path.join(projDir, '.claude'), { recursive: true });
    fs.writeFileSync(
      path.join(projDir, '.claude', 'settings.json'),
      JSON.stringify({ model: 'opus' }),
    );
    const snap = getSettings(projDir);
    expect(snap.projectPath).toBe(projDir);
    // Full 4-layer order, low → high precedence.
    expect(snap.layers.map((l) => l.source)).toEqual([
      'user',
      'project',
      'projectLocal',
      'managed',
    ]);
    expect(snap.effective.model).toBe('opus'); // project overrides absent user
    expect(snap.provenance.model).toEqual(['project']);
    fs.rmSync(projDir, { recursive: true, force: true });
  });
});

interface SettingsChangedPush {
  type?: string;
  snapshot?: SettingsSnapshot;
}

function changedPushes(): SettingsChangedPush[] {
  return broadcastMock.mock.calls
    .map(([d]) => d as SettingsChangedPush)
    .filter((d) => d.type === 'settings_changed');
}

describe('settings.service watchSettings', () => {
  it('broadcasts a recomputed snapshot when a watched layer changes', async () => {
    watchSettings();
    writeUser(JSON.stringify({ model: 'opus' }));

    await waitFor(() =>
      changedPushes().some((d) => d.snapshot?.effective.model === 'opus'),
    );

    const push = changedPushes().find((d) => d.snapshot?.effective.model === 'opus');
    expect(push?.snapshot?.effective.model).toBe('opus');
  });

  it('does not re-broadcast when the same content is written again (diff guard)', async () => {
    watchSettings();

    writeUser(JSON.stringify({ model: 'opus' }));
    await waitFor(() => changedPushes().length === 1);

    // Re-write byte-identical content → snapshot unchanged → no second push.
    writeUser(JSON.stringify({ model: 'opus' }));
    await new Promise((r) => setTimeout(r, 400)); // past the 150ms debounce
    expect(changedPushes().length).toBe(1);
  });
});
