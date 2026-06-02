// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { mergeLayers } from './settings.merge';
import type { SettingsLayer } from '../types/settings.types';

function layer(source: SettingsLayer['source'], data: Record<string, unknown> | null): SettingsLayer {
  return { source, path: `/fake/${source}.json`, exists: data !== null, data };
}

describe('mergeLayers', () => {
  it('scalars: highest-precedence layer wins; provenance is the single winner', () => {
    const { effective, provenance } = mergeLayers([
      layer('user', { model: 'sonnet' }),
      layer('managed', { model: 'opus' }),
    ]);
    expect(effective.model).toBe('opus');
    expect(provenance.model).toEqual(['managed']);
  });

  it('managed wins ties (applied last)', () => {
    const { effective } = mergeLayers([
      layer('user', { theme: 'dark' }),
      layer('project', { theme: 'light' }),
      layer('managed', { theme: 'system' }),
    ]);
    expect(effective.theme).toBe('system');
  });

  it('arrays concatenate across layers; provenance lists ALL contributors in precedence order', () => {
    const { effective, provenance } = mergeLayers([
      layer('user', { permissions: { allow: ['Read'] } } as Record<string, unknown>),
      layer('project', { permissions: { allow: ['Write'] } } as Record<string, unknown>),
    ]);
    expect((effective.permissions as { allow: string[] }).allow).toEqual(['Read', 'Write']);
    expect(provenance.permissions).toEqual(['user', 'project']);
  });

  it('objects deep-merge (env keys layer on top, not replace)', () => {
    const { effective } = mergeLayers([
      layer('user', { env: { A: '1', B: '1' } }),
      layer('project', { env: { B: '2', C: '3' } }),
    ]);
    expect(effective.env).toEqual({ A: '1', B: '2', C: '3' });
  });

  it('null / malformed layers are skipped entirely', () => {
    const { effective, provenance } = mergeLayers([
      layer('user', { model: 'sonnet' }),
      layer('project', null), // malformed or absent
    ]);
    expect(effective.model).toBe('sonnet');
    expect(provenance.model).toEqual(['user']);
  });

  it('a top-level key contributed by multiple layers via deep-merge lists all of them', () => {
    const { provenance } = mergeLayers([
      layer('user', { env: { A: '1' } }),
      layer('project', { env: { B: '2' } }),
    ]);
    expect(provenance.env).toEqual(['user', 'project']);
  });
});
