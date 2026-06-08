import { describe, expect, it } from 'vitest';

import { LineKind } from './diff.types';
import { parseEditTool } from './parseEditTool';

describe('parseEditTool', () => {
  it('returns null for an unknown tool name', () => {
    expect(parseEditTool('Bash', '{"command":"ls"}')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseEditTool('Edit', 'not json {')).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    expect(parseEditTool('Edit', '{"file_path":"a.ts"}')).toBeNull();
    expect(parseEditTool('Write', '{"file_path":"a.ts"}')).toBeNull();
  });

  describe('Edit', () => {
    it('produces context, del and add lines with running line numbers', () => {
      const json = JSON.stringify({
        file_path: '/repo/a.ts',
        old_string: 'line1\nold2\nline3',
        new_string: 'line1\nnew2\nline3',
      });
      const result = parseEditTool('Edit', json);
      expect(result).not.toBeNull();
      expect(result?.filePath).toBe('/repo/a.ts');

      const kinds = result?.lines.map((l) => l.kind);
      expect(kinds).toContain(LineKind.Context);
      expect(kinds).toContain(LineKind.Del);
      expect(kinds).toContain(LineKind.Add);

      const del = result?.lines.find((l) => l.kind === LineKind.Del);
      expect(del?.text).toBe('old2');
      expect(del?.oldNo).toBe(2);
      expect(del?.newNo).toBeNull();

      const add = result?.lines.find((l) => l.kind === LineKind.Add);
      expect(add?.text).toBe('new2');
      expect(add?.newNo).toBe(2);
      expect(add?.oldNo).toBeNull();

      const firstContext = result?.lines.find((l) => l.kind === LineKind.Context);
      expect(firstContext?.text).toBe('line1');
      expect(firstContext?.oldNo).toBe(1);
      expect(firstContext?.newNo).toBe(1);
    });

    it('numbers context after a hunk correctly on both sides', () => {
      const json = JSON.stringify({
        file_path: 'a.ts',
        old_string: 'a\nb\nc',
        new_string: 'a\nb\nc',
      });
      const result = parseEditTool('Edit', json);
      // No change -> all context, identical numbering.
      expect(result?.lines.every((l) => l.kind === LineKind.Context)).toBe(true);
      const all = result?.lines ?? [];
      const last = all[all.length - 1];
      expect(last?.oldNo).toBe(3);
      expect(last?.newNo).toBe(3);
    });
  });

  describe('Write', () => {
    it('marks every line as an add with only new line numbers', () => {
      const json = JSON.stringify({ file_path: 'new.ts', content: 'a\nb\nc' });
      const result = parseEditTool('Write', json);
      expect(result?.filePath).toBe('new.ts');
      expect(result?.lines).toHaveLength(3);
      expect(result?.lines.every((l) => l.kind === LineKind.Add)).toBe(true);
      expect(result?.lines.map((l) => l.newNo)).toEqual([1, 2, 3]);
      expect(result?.lines.every((l) => l.oldNo === null)).toBe(true);
      expect(result?.lines.map((l) => l.text)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('MultiEdit', () => {
    it('concatenates the diff of each edit', () => {
      const json = JSON.stringify({
        file_path: 'multi.ts',
        edits: [
          { old_string: 'foo', new_string: 'bar' },
          { old_string: 'baz', new_string: 'qux' },
        ],
      });
      const result = parseEditTool('MultiEdit', json);
      expect(result?.filePath).toBe('multi.ts');
      const dels = result?.lines.filter((l) => l.kind === LineKind.Del).map((l) => l.text);
      const adds = result?.lines.filter((l) => l.kind === LineKind.Add).map((l) => l.text);
      expect(dels).toEqual(['foo', 'baz']);
      expect(adds).toEqual(['bar', 'qux']);
    });

    it('returns null when edits is missing', () => {
      expect(parseEditTool('MultiEdit', '{"file_path":"a.ts"}')).toBeNull();
    });
  });
});
