import { Check } from 'lucide-react';

import { Badge } from '@/components/_ui/Badge';
import { Button, type ButtonProps } from '@/components/_ui/Button';
import { Chip } from '@/components/_ui/Chip';

import type { AskOption, AskPrompt } from '../../askPrompt';
import { extractAuthInfo } from '../authInfo';
import { useRovingChoice } from '../useRovingChoice';

type ChoicePrompt = Extract<AskPrompt, { type: 'choice' }>;

export type AuthorizationCardProps = {
  prompt: ChoicePrompt;
  isActive: boolean;
  onAnswer: (value: string) => void;
};

/** Picks the Button intent for an option: the first `accept` is the primary
 *  action (Approuver), any further `accept` (e.g. "toujours autoriser") is
 *  secondary, and `deny` is danger. Returns a value→behavior decision, not a
 *  fallback chain. */
function intentFor(option: AskOption, acceptOrdinal: number): ButtonProps['intent'] {
  if (option.variant === 'deny') return 'danger';
  if (option.variant === 'accept') return acceptOrdinal === 0 ? 'primary' : 'secondary';
  return 'secondary';
}

/** The MCP authorization request card (chat-thread design): a warning-tinted
 *  card carrying the server `Badge` + the full MCP tool `Chip`, an explanatory
 *  line, and the prompt's options rendered as action buttons. Keeps the roving
 *  listbox semantics (keyboard nav + `role="option"`) so it stays accessible. */
export function AuthorizationCard({ prompt, isActive, onAnswer }: AuthorizationCardProps) {
  const { highlighted, setHighlighted, listRef, onKeyDown, submit } = useRovingChoice(
    prompt.options,
    isActive,
    onAnswer,
  );
  const { toolId, server } = extractAuthInfo(prompt);

  let acceptSeen = 0;
  return (
    <div
      className="mt-1 rounded-[var(--radius-lg)] border p-4"
      style={{
        background: 'var(--color-surface-1)',
        borderColor: 'color-mix(in srgb, var(--color-warning) 28%, var(--color-border))',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {server || toolId ? (
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          {server ? <Badge variant="yellow">{server}</Badge> : null}
          {toolId ? <Chip>{toolId}</Chip> : null}
        </div>
      ) : null}
      <div className="mb-4 text-[14.5px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
        {prompt.question}
      </div>
      <div
        ref={listRef}
        role="listbox"
        aria-label={prompt.question}
        aria-activedescendant={isActive ? `ask-option-${highlighted}` : undefined}
        tabIndex={isActive ? 0 : -1}
        onKeyDown={onKeyDown}
        className="flex flex-wrap items-center gap-2.5 outline-none"
        style={{ opacity: isActive ? 1 : 0.5 }}
      >
        {prompt.options.map((option, i) => {
          const ordinal = option.variant === 'accept' ? acceptSeen++ : -1;
          const intent = intentFor(option, ordinal);
          return (
            <Button
              key={option.value}
              id={`ask-option-${i}`}
              role="option"
              aria-selected={isActive ? i === highlighted : false}
              tabIndex={-1}
              disabled={!isActive}
              intent={intent}
              size="sm"
              leftIcon={intent === 'primary' ? <Check size={15} /> : undefined}
              onClick={() => isActive && submit(i)}
              onMouseEnter={() => isActive && setHighlighted(i)}
              style={
                isActive && i === highlighted
                  ? { outline: '2px solid var(--focus-ring)', outlineOffset: '2px' }
                  : undefined
              }
            >
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
