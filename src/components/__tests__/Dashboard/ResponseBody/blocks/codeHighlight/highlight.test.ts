import { describe, expect, it } from 'vitest';

import { highlight } from '@/components/Dashboard/ResponseBody/blocks/codeHighlight/highlight';
import { TokenType } from '@/components/Dashboard/ResponseBody/blocks/codeHighlight/types';

/** Reassemble token text per line — highlighting must never alter the source. */
function lineText(line: { text: string }[]): string {
  return line.map((t) => t.text).join('');
}

describe('highlight', () => {
  it('produces one HighlightedLine per source line', () => {
    const code = 'const a = 1;\nconst b = 2;\n\nreturn a;';
    const lines = highlight(code, 'ts');
    expect(lines).toHaveLength(4);
    expect(lineText(lines[2])).toBe('');
  });

  it('preserves the exact source text token-for-token', () => {
    const code = "function f(n) {\n  return `x=${n}`; // note\n}";
    const lines = highlight(code, 'js');
    expect(lines.map(lineText).join('\n')).toBe(code);
  });

  it('tokenizes keywords, functions, strings, numbers and comments', () => {
    const lines = highlight('const x = greet("hi", 42); // c', 'ts');
    const types = lines[0].map((t) => t.type);
    expect(types).toContain(TokenType.Keyword); // const
    expect(types).toContain(TokenType.Function); // greet(
    expect(types).toContain(TokenType.String); // "hi"
    expect(types).toContain(TokenType.Number); // 42
    expect(types).toContain(TokenType.Comment); // // c
  });

  it('classifies `const` as a keyword token', () => {
    const lines = highlight('const x = 1;', 'ts');
    const kw = lines[0].find((t) => t.text === 'const');
    expect(kw?.type).toBe(TokenType.Keyword);
  });

  it('highlights python keywords for the python language', () => {
    const lines = highlight('def f(n):\n    return n', 'python');
    const def = lines[0].find((t) => t.text === 'def');
    expect(def?.type).toBe(TokenType.Keyword);
  });

  it('highlights bash comments and keywords', () => {
    const lines = highlight('# comment\nif true; then echo hi; fi', 'bash');
    expect(lines[0][0].type).toBe(TokenType.Comment);
    const ifTok = lines[1].find((t) => t.text === 'if');
    expect(ifTok?.type).toBe(TokenType.Keyword);
  });

  it('falls back to a single plain token per line for an unknown language', () => {
    const lines = highlight('@@@ not real code @@@\nsecond line', 'wat');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual([{ type: TokenType.Plain, text: '@@@ not real code @@@' }]);
    expect(lineText(lines[1])).toBe('second line');
  });

  it('falls back to plain when language is null', () => {
    const lines = highlight('whatever here', null);
    expect(lines[0][0].type).toBe(TokenType.Plain);
    expect(lineText(lines[0])).toBe('whatever here');
  });

  it('does not crash on empty input', () => {
    expect(highlight('', 'ts')).toEqual([[]]);
  });
});
