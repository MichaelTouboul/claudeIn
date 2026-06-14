import type { CSSProperties } from 'react';

import { type DiffLine, LineKind } from './diff.types';

/** Visual behavior for a diff line, keyed by its kind (enum + behavior map). */
export type LineStyle = {
  /** Single-char gutter sign shown before the text. */
  sign: string;
  /** Row background tint. */
  background: string;
  /** Text/sign color. */
  color: string;
};

export const lineStyleByKind: Record<LineKind, LineStyle> = {
  [LineKind.Add]: {
    sign: '+',
    background: 'color-mix(in srgb, var(--color-active) 12%, transparent)',
    color: 'var(--color-active)',
  },
  [LineKind.Del]: {
    sign: '-',
    background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)',
    color: 'var(--color-danger)',
  },
  [LineKind.Context]: {
    sign: ' ',
    background: 'transparent',
    color: 'var(--color-text-secondary)',
  },
};

/** Format a gutter line number (or a blank cell when absent). */
export function gutterLabel(no: number | null): string {
  return no === null ? '' : String(no);
}

const gutterBase: CSSProperties = {
  width: '2.5rem',
  textAlign: 'right',
  paddingInline: '0.5rem',
  color: 'var(--color-text-muted)',
  userSelect: 'none',
};

export function gutterStyle(): CSSProperties {
  return gutterBase;
}

/** Serialize a FileDiff back to a copyable unified-diff-ish text block. */
export function linesToText(lines: DiffLine[]): string {
  return lines.map((l) => `${lineStyleByKind[l.kind].sign}${l.text}`).join('\n');
}
