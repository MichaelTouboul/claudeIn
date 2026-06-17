/**
 * Pure markdown-formatting transforms for the prompt-editor toolbar. Each takes
 * the current text + a [start, end) selection range and returns the new text
 * plus the selection to restore — so the toolbar buttons do real work on the
 * markdown the composer consumes, with no contentEditable/execCommand fragility.
 */

/** The finite set of toolbar formats. Drives the toolbar config + this map. */
export const PromptFormat = {
  Bold: 'bold',
  Italic: 'italic',
  Heading: 'heading',
  List: 'list',
  OrderedList: 'ordered-list',
  Code: 'code',
} as const;
export type PromptFormat = (typeof PromptFormat)[keyof typeof PromptFormat];

export type FormatResult = { text: string; selStart: number; selEnd: number };
type Formatter = (text: string, start: number, end: number) => FormatResult;

/** Wrap the selection in `marker` on both sides (bold/italic/inline-code). */
function wrap(marker: string): Formatter {
  return (text, start, end) => {
    const selected = text.slice(start, end) || '';
    const next = `${text.slice(0, start)}${marker}${selected}${marker}${text.slice(end)}`;
    return { text: next, selStart: start + marker.length, selEnd: end + marker.length };
  };
}

/** Prefix every selected line (or the caret line) with `prefix`. */
function linePrefix(prefix: (lineIndex: number) => string): Formatter {
  return (text, start, end) => {
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = text.indexOf('\n', end) === -1 ? text.length : text.indexOf('\n', end);
    const block = text.slice(lineStart, lineEnd);
    const lines = block.split('\n');
    const prefixed = lines.map((line, i) => `${prefix(i)}${line}`).join('\n');
    const next = `${text.slice(0, lineStart)}${prefixed}${text.slice(lineEnd)}`;
    return { text: next, selStart: lineStart, selEnd: lineStart + prefixed.length };
  };
}

/** format → transform. Total over the enum (no fallback chain). */
export const FORMATTERS: Record<PromptFormat, Formatter> = {
  [PromptFormat.Bold]: wrap('**'),
  [PromptFormat.Italic]: wrap('*'),
  [PromptFormat.Code]: wrap('`'),
  [PromptFormat.Heading]: linePrefix(() => '### '),
  [PromptFormat.List]: linePrefix(() => '- '),
  [PromptFormat.OrderedList]: linePrefix((i) => `${i + 1}. `),
};

/** Apply a format to a text + selection range. */
export function applyFormat(format: PromptFormat, text: string, start: number, end: number): FormatResult {
  return FORMATTERS[format](text, start, end);
}

/** Live word + character counts from plain markdown text. */
export function countWordsChars(text: string): { words: number; chars: number } {
  const trimmed = text.trim();
  const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
  return { words, chars: text.length };
}
