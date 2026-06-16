/**
 * Token kinds emitted by the homegrown highlighter. A finite set, mapped to a
 * design-system color in `tokenTheme.ts` (the interactive-block theme bridge).
 */
export const TokenType = {
  Keyword: 'keyword',
  String: 'string',
  Number: 'number',
  Comment: 'comment',
  Function: 'function',
  Punctuation: 'punctuation',
  Plain: 'plain',
} as const;
export type TokenType = (typeof TokenType)[keyof typeof TokenType];

/** A single highlighted run of text. */
export interface Token {
  type: TokenType;
  text: string;
}

/** One source line, as an ordered list of tokens. Empty lines -> `[]`. */
export type HighlightedLine = Token[];
