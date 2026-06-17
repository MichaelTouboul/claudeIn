import { describe, expect, it } from 'vitest';

import {
  applyFormat,
  countWordsChars,
  PromptFormat,
} from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/PromptEditorTab/markdownFormat';

describe('applyFormat', () => {
  it('wraps the selection in bold markers', () => {
    const r = applyFormat(PromptFormat.Bold, 'one two three', 4, 7);
    expect(r.text).toBe('one **two** three');
    expect(r.text.slice(r.selStart, r.selEnd)).toBe('two');
  });

  it('wraps the selection in italic markers', () => {
    const r = applyFormat(PromptFormat.Italic, 'word', 0, 4);
    expect(r.text).toBe('*word*');
  });

  it('wraps the selection in inline-code backticks', () => {
    const r = applyFormat(PromptFormat.Code, 'x', 0, 1);
    expect(r.text).toBe('`x`');
  });

  it('prefixes the caret line with a heading marker', () => {
    const r = applyFormat(PromptFormat.Heading, 'Title', 2, 2);
    expect(r.text).toBe('### Title');
  });

  it('prefixes every selected line with a bullet', () => {
    const r = applyFormat(PromptFormat.List, 'a\nb', 0, 3);
    expect(r.text).toBe('- a\n- b');
  });

  it('prefixes every selected line with an incrementing number', () => {
    const r = applyFormat(PromptFormat.OrderedList, 'a\nb', 0, 3);
    expect(r.text).toBe('1. a\n2. b');
  });
});

describe('countWordsChars', () => {
  it('counts words and characters of plain text', () => {
    expect(countWordsChars('one two three')).toEqual({ words: 3, chars: 13 });
  });

  it('reports zero words for empty / whitespace text', () => {
    expect(countWordsChars('')).toEqual({ words: 0, chars: 0 });
    expect(countWordsChars('   ')).toEqual({ words: 0, chars: 3 });
  });
});
