import { describe, expect, it, vi } from 'vitest';

import {
  dispatchSlashCommand,
  findSlashCommand,
  type LocalSlashHandlers,
  SLASH_COMMANDS,
  SlashCommandKind,
  type SlashViewTarget,
} from './slashRegistry';

describe('slash registry — data', () => {
  it('registers /clear as a local command', () => {
    const entry = findSlashCommand('/clear');
    expect(entry?.kind).toBe(SlashCommandKind.Local);
  });

  it('registers /compact as a cli command (forwarded to claude, really compacts via --print)', () => {
    const entry = findSlashCommand('/compact');
    expect(entry?.kind).toBe(SlashCommandKind.Cli);
  });

  it('every command has a cmd, desc and a known kind', () => {
    const knownKinds: SlashCommandKind[] = [
      SlashCommandKind.Local,
      SlashCommandKind.Cli,
      SlashCommandKind.Model,
      SlashCommandKind.View,
      SlashCommandKind.Improve,
    ];
    for (const c of SLASH_COMMANDS) {
      expect(c.cmd.startsWith('/')).toBe(true);
      expect(typeof c.desc).toBe('string');
      expect(knownKinds).toContain(c.kind);
    }
  });

  it('exposes ONLY the honest v1 menu (no dead placeholders)', () => {
    const cmds = SLASH_COMMANDS.map((c) => c.cmd).sort();
    expect(cmds).toEqual([
      '/agents',
      '/clear',
      '/compact',
      '/feature-request',
      '/improve',
      '/model',
      '/skills',
    ]);
  });

  it.each([
    '/help',
    '/init',
    '/review',
    '/config',
    '/cost',
    '/doctor',
    '/login',
    '/logout',
    '/memory',
    '/permissions',
    '/status',
    '/terminal-setup',
    '/vim',
    '/mcp',
  ])('no longer resolves the removed command %s', (cmd) => {
    expect(findSlashCommand(cmd)).toBeUndefined();
  });
});

describe('slash registry — /model', () => {
  it('registers /model as a model command (opens the picker, not the CLI)', () => {
    const entry = findSlashCommand('/model');
    expect(entry?.kind).toBe(SlashCommandKind.Model);
  });
});

describe('slash registry — view commands', () => {
  it('registers /agents as a view command targeting the agent screen', () => {
    const entry = findSlashCommand('/agents');
    expect(entry?.kind).toBe(SlashCommandKind.View);
    expect(entry?.kind === SlashCommandKind.View ? entry.view : null).toBe<SlashViewTarget>('agents');
  });

  it('registers /skills as a view command targeting the skill screen', () => {
    const entry = findSlashCommand('/skills');
    expect(entry?.kind).toBe(SlashCommandKind.View);
    expect(entry?.kind === SlashCommandKind.View ? entry.view : null).toBe<SlashViewTarget>('skills');
  });
});

describe('dispatchSlashCommand — routing by kind', () => {
  function makeDeps(): {
    handlers: LocalSlashHandlers;
    sendToCli: ReturnType<typeof vi.fn>;
    openModelPicker: ReturnType<typeof vi.fn>;
    openView: ReturnType<typeof vi.fn>;
    openImprove: ReturnType<typeof vi.fn>;
  } {
    return {
      handlers: { clear: vi.fn() },
      sendToCli: vi.fn(),
      openModelPicker: vi.fn(),
      openView: vi.fn(),
      openImprove: vi.fn(),
    };
  }

  it("routes a 'local' command (/clear) to its handler, NOT to the CLI", () => {
    const deps = makeDeps();
    const handled = dispatchSlashCommand('/clear', deps);
    expect(handled).toBe(true);
    expect(deps.handlers.clear).toHaveBeenCalledTimes(1);
    expect(deps.sendToCli).not.toHaveBeenCalled();
    expect(deps.openModelPicker).not.toHaveBeenCalled();
    expect(deps.openView).not.toHaveBeenCalled();
  });

  it("routes a 'cli' command (/compact) to the send path, NOT to a local handler", () => {
    const deps = makeDeps();
    const handled = dispatchSlashCommand('/compact', deps);
    expect(handled).toBe(true);
    expect(deps.sendToCli).toHaveBeenCalledWith('/compact');
    expect(deps.handlers.clear).not.toHaveBeenCalled();
    expect(deps.openModelPicker).not.toHaveBeenCalled();
    expect(deps.openView).not.toHaveBeenCalled();
  });

  it('routes /model to the picker opener, NOT to the CLI', () => {
    const deps = makeDeps();
    const handled = dispatchSlashCommand('/model', deps);
    expect(handled).toBe(true);
    expect(deps.openModelPicker).toHaveBeenCalledTimes(1);
    expect(deps.sendToCli).not.toHaveBeenCalled();
    expect(deps.handlers.clear).not.toHaveBeenCalled();
    expect(deps.openView).not.toHaveBeenCalled();
  });

  it("routes /agents to openView('agents'), NOT to the CLI", () => {
    const deps = makeDeps();
    const handled = dispatchSlashCommand('/agents', deps);
    expect(handled).toBe(true);
    expect(deps.openView).toHaveBeenCalledWith('agents');
    expect(deps.sendToCli).not.toHaveBeenCalled();
    expect(deps.openModelPicker).not.toHaveBeenCalled();
  });

  it("routes /skills to openView('skills'), NOT to the CLI", () => {
    const deps = makeDeps();
    const handled = dispatchSlashCommand('/skills', deps);
    expect(handled).toBe(true);
    expect(deps.openView).toHaveBeenCalledWith('skills');
    expect(deps.sendToCli).not.toHaveBeenCalled();
    expect(deps.openModelPicker).not.toHaveBeenCalled();
  });

  it("routes /improve to openImprove(null) — a general request, NOT to the CLI", () => {
    const deps = makeDeps();
    const handled = dispatchSlashCommand('/improve', deps);
    expect(handled).toBe(true);
    expect(deps.openImprove).toHaveBeenCalledWith(null);
    expect(deps.sendToCli).not.toHaveBeenCalled();
    expect(deps.openModelPicker).not.toHaveBeenCalled();
    expect(deps.openView).not.toHaveBeenCalled();
  });

  it('routes the /feature-request alias to openImprove(null) too', () => {
    const deps = makeDeps();
    const handled = dispatchSlashCommand('/feature-request', deps);
    expect(handled).toBe(true);
    expect(deps.openImprove).toHaveBeenCalledWith(null);
    expect(deps.sendToCli).not.toHaveBeenCalled();
  });

  it('returns false for an unregistered command (caller falls back to a normal send)', () => {
    const deps = makeDeps();
    const handled = dispatchSlashCommand('/not-a-real-cmd', deps);
    expect(handled).toBe(false);
    expect(deps.handlers.clear).not.toHaveBeenCalled();
    expect(deps.sendToCli).not.toHaveBeenCalled();
    expect(deps.openModelPicker).not.toHaveBeenCalled();
    expect(deps.openView).not.toHaveBeenCalled();
  });

  it('returns false for a removed command (e.g. /help no longer registered)', () => {
    const deps = makeDeps();
    expect(dispatchSlashCommand('/help', deps)).toBe(false);
    expect(deps.sendToCli).not.toHaveBeenCalled();
  });

  it('trims surrounding whitespace before matching', () => {
    const deps = makeDeps();
    const handled = dispatchSlashCommand('  /clear  ', deps);
    expect(handled).toBe(true);
    expect(deps.handlers.clear).toHaveBeenCalledTimes(1);
  });
});
