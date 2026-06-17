import { Bold, Bot, Code, Heading, Italic, Link, List, ListOrdered } from 'lucide-react';
import type { ComponentType } from 'react';

import { cn } from '@/lib/utils';

import { PromptFormat } from './markdownFormat';

type ToolButton = { format: PromptFormat; Icon: ComponentType<{ size?: number }>; label: string };

// Format buttons, in the design's order; separators are positioned by index.
const FORMAT_BUTTONS: ToolButton[] = [
  { format: PromptFormat.Bold, Icon: Bold, label: 'Gras' },
  { format: PromptFormat.Italic, Icon: Italic, label: 'Italique' },
  { format: PromptFormat.Heading, Icon: Heading, label: 'Titre' },
  { format: PromptFormat.List, Icon: List, label: 'Liste' },
  { format: PromptFormat.OrderedList, Icon: ListOrdered, label: 'Liste ordonnée' },
  { format: PromptFormat.Code, Icon: Code, label: 'Code' },
];
// Separators sit AFTER these zero-based button indices (matches the mock).
const SEPARATOR_AFTER = new Set([1, 4]);

type PromptEditorToolbarProps = {
  /** The currently "armed" format (button shown active), or null. */
  active: PromptFormat | null;
  onFormat: (format: PromptFormat) => void;
  /** Stubbed link affordance (documented follow-up). */
  onLink: () => void;
  /** Stubbed agent-insert affordance (documented follow-up). */
  onInsertAgent: () => void;
};

const tbtn =
  'inline-flex h-[30px] w-[30px] items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-surface-3 hover:text-fg';

/**
 * The format toolbar from the design (`.wk-toolbar`): bold/italic | heading/list/
 * ordered | code/link · insert-agent. Buttons map to real markdown transforms via
 * {@link PromptFormat}; link + insert-agent are minimal stubs (see report).
 */
export function PromptEditorToolbar({ active, onFormat, onLink, onInsertAgent }: PromptEditorToolbarProps) {
  return (
    <div
      className="flex items-center gap-0.5 px-2.5 py-1.5 shrink-0"
      style={{
        borderBottom: '1px solid var(--color-border-subtle)',
        background: 'var(--color-surface-2)',
      }}
    >
      {FORMAT_BUTTONS.map(({ format, Icon, label }, i) => (
        <span key={format} className="flex items-center">
          <button
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active === format}
            onClick={() => onFormat(format)}
            className={cn(
              tbtn,
              active === format && 'bg-[var(--color-accent-subtle)] text-[var(--color-accent-text)]',
            )}
          >
            <Icon size={15} />
          </button>
          {SEPARATOR_AFTER.has(i) ? (
            <span className="mx-1.5 h-[18px] w-px shrink-0" style={{ background: 'var(--color-border)' }} />
          ) : null}
        </span>
      ))}
      <button type="button" title="Lien" aria-label="Lien" onClick={onLink} className={tbtn}>
        <Link size={15} />
      </button>
      <div className="flex-1" />
      <button type="button" title="Insérer un agent" aria-label="Insérer un agent" onClick={onInsertAgent} className={tbtn}>
        <Bot size={15} />
      </button>
    </div>
  );
}
