import { describe, expect, it } from 'vitest';

import { parseSlashCommand, stripHarnessNoise } from '@/components/Dashboard/AgentChat/slashCommand';

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

describe('stripHarnessNoise', () => {
  it('strips a multi-line <task-notification> block', () => {
    const content =
      '<task-notification>\n' +
      '<task-id>bj40in9jm</task-id>\n' +
      '<tool-use-id>toolu_123</tool-use-id>\n' +
      '<output-file>/tmp/tasks/bj40in9jm.output</output-file>\n' +
      '<status>killed</status>\n' +
      '<summary>Background command "x" was stopped</summary>\n' +
      '</task-notification>';
    expect(stripHarnessNoise(content).trim()).toBe('');
  });

  it('strips a <system-reminder> block', () => {
    const content = '<system-reminder>\nThis is a reminder injected by the harness.\n</system-reminder>';
    expect(stripHarnessNoise(content).trim()).toBe('');
  });

  it('strips a <tool_result> block, including attributes on the opening tag', () => {
    const content = '<tool_result tool_use_id="toolu_abc">file written</tool_result>';
    expect(stripHarnessNoise(content).trim()).toBe('');
  });

  it('keeps genuine prose and removes an appended <system-reminder>', () => {
    const content =
      'Please refactor the parser to be faster.\n' +
      '<system-reminder>Some plumbing the user never typed.</system-reminder>';
    expect(stripHarnessNoise(content).trim()).toBe('Please refactor the parser to be faster.');
  });

  it('keeps prose that surrounds a <task-notification>', () => {
    const content =
      'before text ' +
      '<task-notification><status>killed</status></task-notification>' +
      ' after text';
    expect(stripHarnessNoise(content).replace(/\s+/g, ' ').trim()).toBe('before text after text');
  });

  it('strips multiple noise blocks of different kinds in one turn', () => {
    const content =
      '<system-reminder>r1</system-reminder>\n' +
      'real prompt\n' +
      '<task-notification><status>completed</status></task-notification>';
    expect(stripHarnessNoise(content).trim()).toBe('real prompt');
  });

  it('leaves content with no noise blocks untouched', () => {
    expect(stripHarnessNoise('just a normal message')).toBe('just a normal message');
  });
});
