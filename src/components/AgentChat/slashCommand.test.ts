import { describe, expect, it } from 'vitest';

import { parseSlashCommand } from './slashCommand';

describe('parseSlashCommand', () => {
  it('parses an invocation with no args (command-name first, indented)', () => {
    const content =
      '<command-name>/compact</command-name>\n' +
      '            <command-message>compact</command-message>\n' +
      '            <command-args></command-args>';
    expect(parseSlashCommand(content)).toEqual({ kind: 'invocation', name: '/compact' });
  });

  it('parses an invocation with args (command-message first), args is the typed prose', () => {
    const content =
      '<command-message>update-task</command-message>\n' +
      '<command-name>/update-task</command-name>\n' +
      "<command-args>avec tout ce qu'on a fait</command-args>";
    expect(parseSlashCommand(content)).toEqual({
      kind: 'invocation',
      name: '/update-task',
      args: "avec tout ce qu'on a fait",
    });
  });

  it('keeps the leading slash on the command name', () => {
    const content = '<command-name>/clear</command-name><command-args></command-args>';
    const parsed = parseSlashCommand(content);
    expect(parsed).toEqual({ kind: 'invocation', name: '/clear' });
  });

  it('parses a stdout output message (trimmed)', () => {
    expect(parseSlashCommand('<local-command-stdout>Compacted </local-command-stdout>')).toEqual({
      kind: 'output',
      stream: 'stdout',
      text: 'Compacted',
    });
  });

  it('parses a stderr output message', () => {
    expect(
      parseSlashCommand('<local-command-stderr>boom failed</local-command-stderr>')
    ).toEqual({ kind: 'output', stream: 'stderr', text: 'boom failed' });
  });

  it('returns an output with empty text when the stream body is blank', () => {
    expect(parseSlashCommand('<local-command-stdout>   </local-command-stdout>')).toEqual({
      kind: 'output',
      stream: 'stdout',
      text: '',
    });
  });

  it('parses a caveat-only message', () => {
    expect(
      parseSlashCommand('<local-command-caveat>Caveat: the messages below…</local-command-caveat>')
    ).toEqual({ kind: 'caveat' });
  });

  it('parses a caveat that prefixes a command bundle as the invocation', () => {
    const content =
      '<local-command-caveat>Caveat boilerplate</local-command-caveat>\n' +
      '<command-name>/compact</command-name>\n' +
      '<command-message>compact</command-message>\n' +
      '<command-args></command-args>';
    expect(parseSlashCommand(content)).toEqual({ kind: 'invocation', name: '/compact' });
  });

  it('returns null for normal prose that merely quotes a wrapper tag inline', () => {
    const content =
      "regarde l'ouput que je recois: " +
      '<local-command-stdout>Compacted </local-command-stdout> Quelle horreur!!!';
    expect(parseSlashCommand(content)).toBeNull();
  });

  it('returns null for prose with no tags at all', () => {
    expect(parseSlashCommand('just a normal message')).toBeNull();
  });
});
