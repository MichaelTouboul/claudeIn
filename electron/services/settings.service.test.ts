// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { getSettings } from './settings.service';

let tmpHome: string;
let prevHome: string | undefined;

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cam-settings-'));
  prevHome = process.env.HOME;
  process.env.HOME = tmpHome;
  fs.mkdirSync(path.join(tmpHome, '.claude'), { recursive: true });
});

afterEach(() => {
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

function writeUser(json: string) {
  fs.writeFileSync(path.join(tmpHome, '.claude', 'settings.json'), json);
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
