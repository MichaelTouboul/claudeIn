import { TokenType } from './types';

/**
 * Theme bridge (interactive-block exception, see src/CLAUDE.md): maps each
 * highlighter token kind to a design-system CSS-var color. This is the ONE
 * place colors are attached to highlighter output — no raw hex anywhere.
 */
export const TOKEN_COLOR: Record<TokenType, string> = {
  [TokenType.Keyword]: 'var(--color-accent-text)',
  [TokenType.String]: 'var(--color-active)',
  [TokenType.Number]: 'var(--color-warning)',
  [TokenType.Comment]: 'var(--color-text-muted)',
  [TokenType.Function]: 'var(--color-info)',
  [TokenType.Punctuation]: 'var(--color-text-muted)',
  [TokenType.Plain]: 'var(--color-text-primary)',
};
