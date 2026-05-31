import { ListItemNode, ListNode } from '@lexical/list';
import { $convertFromMarkdownString } from '@lexical/markdown';
import { createEditor } from 'lexical';
import { describe, expect, it } from 'vitest';

import { CHAT_TRANSFORMERS } from './markdownTransformers';
import { editorToMarkdown, matchSlashQuery } from './serialize';

function editorFromMarkdown(md: string) {
  const editor = createEditor({
    nodes: [ListNode, ListItemNode],
    onError: (e) => {
      throw e;
    },
  });
  editor.update(
    () => {
      $convertFromMarkdownString(md, CHAT_TRANSFORMERS);
    },
    { discrete: true }
  );
  return editor;
}

describe('editorToMarkdown', () => {
  it('round-trips bold', () => {
    expect(editorToMarkdown(editorFromMarkdown('a **bold** b'))).toBe('a **bold** b');
  });
  it('round-trips inline code', () => {
    expect(editorToMarkdown(editorFromMarkdown('use `x` here'))).toBe('use `x` here');
  });
  it('round-trips a bullet list', () => {
    expect(editorToMarkdown(editorFromMarkdown('- one\n- two'))).toBe('- one\n- two');
  });
  it('round-trips an ordered list', () => {
    expect(editorToMarkdown(editorFromMarkdown('1. one\n2. two'))).toBe('1. one\n2. two');
  });
});

describe('matchSlashQuery', () => {
  it('returns the token for a bare slash command', () => {
    expect(matchSlashQuery('/comp')).toBe('comp');
    expect(matchSlashQuery('/')).toBe('');
  });
  it('returns null when not a bare slash command', () => {
    expect(matchSlashQuery('hello /comp')).toBeNull();
    expect(matchSlashQuery('/comp x')).toBeNull();
    expect(matchSlashQuery('text')).toBeNull();
  });
});
