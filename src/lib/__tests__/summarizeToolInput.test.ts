import { describe, expect, it } from 'vitest';

import { summarizeToolContent, summarizeToolInput } from '@/lib/utils';

describe('summarizeToolInput', () => {
  it('basenames file_path tools', () => {
    for (const tool of ['Read', 'Edit', 'Write', 'NotebookEdit']) {
      expect(summarizeToolInput(tool, { file_path: '/a/b/file.ts' })).toBe('file.ts');
    }
  });

  it('ellipsizes long Bash commands on one line', () => {
    expect(summarizeToolInput('Bash', { command: 'echo hi' })).toBe('echo hi');
    expect(summarizeToolInput('Bash', { command: 'a\n  b' })).toBe('a b');
    expect(summarizeToolInput('Bash', { command: 'x'.repeat(60) })).toBe(`${'x'.repeat(40)}…`);
  });

  it('returns pattern / host / task label', () => {
    expect(summarizeToolInput('Grep', { pattern: 'foo' })).toBe('foo');
    expect(summarizeToolInput('WebFetch', { url: 'https://h.com/x' })).toBe('h.com');
    expect(summarizeToolInput('Task', { subagent_type: 'feature-dev' })).toBe('feature-dev');
  });

  it('returns null when nothing sensible', () => {
    expect(summarizeToolInput('Unknown', {})).toBeNull();
    expect(summarizeToolInput('Read', {})).toBeNull();
  });
});

describe('summarizeToolContent', () => {
  it('parses JSON content then summarizes', () => {
    expect(summarizeToolContent('Read', '{"file_path":"/x/y.ts"}')).toBe('y.ts');
  });

  it('returns null for non-JSON content', () => {
    expect(summarizeToolContent('Read', 'not json')).toBeNull();
  });
});
