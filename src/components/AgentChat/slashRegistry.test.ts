import { describe, expect, it, vi } from 'vitest';

import {
  dispatchSlashCommand,
  findSlashCommand,
  type LocalSlashHandlers,
  SLASH_COMMANDS,
  SlashCommandKind,
} from './slashRegistry';

describe('slash registry — data', () => {
  it('registers /clear as a local command', () => {
    const entry = findSlashCommand('/clear');
    expect(entry?.kind).toBe(SlashCommandKind.Local);
  });

  it('registers /help as a cli command (forwarded to claude)', () => {
    const entry = findSlashCommand('/help');
    expect(entry?.kind).toBe(SlashCommandKind.Cli);
  });

  it('every command has a cmd, desc and kind', () => {
    for (const c of SLASH_COMMANDS) {
      expect(c.cmd.startsWith('/')).toBe(true);
      expect(typeof c.desc).toBe('string');
      expect([SlashCommandKind.Local, SlashCommandKind.Cli, SlashCommandKind.Model]).toContain(c.kind);
    }
  });
});

describe('slash registry — /model', () => {
  it('registers /model as a model command (opens the picker, not the CLI)', () => {
    const entry = findSlashCommand('/model');
    expect(entry?.kind).toBe(SlashCommandKind.Model);
  });
});

describe('dispatchSlashCommand — routing by kind', () => {
  function makeHandlers(): {
    handlers: LocalSlashHandlers;
    sendToCli: ReturnType<typeof vi.fn>;
    openModelPicker: ReturnType<typeof vi.fn>;
  } {
    return {
      handlers: { clear: vi.fn() },
      sendToCli: vi.fn(),
      openModelPicker: vi.fn(),
    };
  }

  it("routes a 'local' command (/clear) to its handler, NOT to the CLI", () => {
    const { handlers, sendToCli, openModelPicker } = makeHandlers();
    const handled = dispatchSlashCommand('/clear', { handlers, sendToCli, openModelPicker });
    expect(handled).toBe(true);
    expect(handlers.clear).toHaveBeenCalledTimes(1);
    expect(sendToCli).not.toHaveBeenCalled();
    expect(openModelPicker).not.toHaveBeenCalled();
  });

  it("routes a 'cli' command (/help) to the send path, NOT to a local handler", () => {
    const { handlers, sendToCli, openModelPicker } = makeHandlers();
    const handled = dispatchSlashCommand('/help', { handlers, sendToCli, openModelPicker });
    expect(handled).toBe(true);
    expect(sendToCli).toHaveBeenCalledWith('/help');
    expect(handlers.clear).not.toHaveBeenCalled();
    expect(openModelPicker).not.toHaveBeenCalled();
  });

  it("routes /model to the picker opener, NOT to the CLI", () => {
    const { handlers, sendToCli, openModelPicker } = makeHandlers();
    const handled = dispatchSlashCommand('/model', { handlers, sendToCli, openModelPicker });
    expect(handled).toBe(true);
    expect(openModelPicker).toHaveBeenCalledTimes(1);
    expect(sendToCli).not.toHaveBeenCalled();
    expect(handlers.clear).not.toHaveBeenCalled();
  });

  it('returns false for an unregistered command (caller falls back to a normal send)', () => {
    const { handlers, sendToCli, openModelPicker } = makeHandlers();
    const handled = dispatchSlashCommand('/not-a-real-cmd', { handlers, sendToCli, openModelPicker });
    expect(handled).toBe(false);
    expect(handlers.clear).not.toHaveBeenCalled();
    expect(sendToCli).not.toHaveBeenCalled();
    expect(openModelPicker).not.toHaveBeenCalled();
  });

  it('trims surrounding whitespace before matching', () => {
    const { handlers, sendToCli, openModelPicker } = makeHandlers();
    const handled = dispatchSlashCommand('  /clear  ', { handlers, sendToCli, openModelPicker });
    expect(handled).toBe(true);
    expect(handlers.clear).toHaveBeenCalledTimes(1);
  });
});
