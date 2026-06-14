import type { DiffLine } from './diff.types';
import { lineStyleByKind } from './lineStyle';

/** How many diff lines of context to include on each side of the target line. */
const CONTEXT_RADIUS = 3;

/**
 * Build the `content` block handed to the one-shot LLM for an ask-on-line.
 * Includes the file path, the target line (marked), and a few surrounding
 * diff lines so the model can answer about the line in context.
 */
export function buildAskContext(filePath: string, lines: DiffLine[], targetId: string): string {
  const index = lines.findIndex((l) => l.id === targetId);
  if (index === -1) return `File: ${filePath}`;

  const start = Math.max(0, index - CONTEXT_RADIUS);
  const end = Math.min(lines.length, index + CONTEXT_RADIUS + 1);
  const window = lines.slice(start, end);

  const rendered = window
    .map((l) => {
      const sign = lineStyleByKind[l.kind].sign;
      const marker = l.id === targetId ? '  ◀── this line' : '';
      return `${sign}${l.text}${marker}`;
    })
    .join('\n');

  return `File: ${filePath}\n\n${rendered}`;
}
