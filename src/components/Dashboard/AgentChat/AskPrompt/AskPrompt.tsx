import { type AskOption, type AskPrompt as AskPromptType, replyStyles } from '../askPrompt';
import { AuthorizationCard } from './AuthorizationCard/AuthorizationCard';
import { useRovingChoice } from './useRovingChoice';

type AskPromptProps = {
  prompt: AskPromptType;
  isActive: boolean;
  onAnswer: (value: string) => void;
};

/** True when a choice prompt is an authorization request (carries accept/deny
 *  options) — the case the design renders as a warning-tinted card. */
function isAuthorization(prompt: AskPromptType): boolean {
  return (
    prompt.type === 'choice' &&
    prompt.options.some((o) => o.variant === 'accept' || o.variant === 'deny')
  );
}

/** Renders a structured `cam-ask` prompt. An authorization choice becomes the
 *  `AuthorizationCard`; any other choice renders a keyboard-navigable roving
 *  listbox (↑/↓ + Enter, 1–9 shortcuts, hover/click). `text` renders nothing
 *  (the chat input is the text affordance). Interactive only when `isActive`. */
export function AskPrompt({ prompt, isActive, onAnswer }: AskPromptProps) {
  if (prompt.type === 'choice' && isAuthorization(prompt)) {
    return <AuthorizationCard prompt={prompt} isActive={isActive} onAnswer={onAnswer} />;
  }
  if (prompt.type !== 'choice') return null;
  return <ChoicePicker prompt={prompt} isActive={isActive} onAnswer={onAnswer} />;
}

type ChoicePickerProps = {
  prompt: Extract<AskPromptType, { type: 'choice' }>;
  isActive: boolean;
  onAnswer: (value: string) => void;
};

function ChoicePicker({ prompt, isActive, onAnswer }: ChoicePickerProps) {
  const { highlighted, setHighlighted, listRef, onKeyDown, submit } = useRovingChoice(
    prompt.options,
    isActive,
    onAnswer,
  );

  return (
    <div className="ml-5 mt-2 flex flex-col gap-2">
      <div className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
        {prompt.question}
      </div>
      <div
        ref={listRef}
        role="listbox"
        aria-label={prompt.question}
        aria-activedescendant={isActive ? `ask-option-${highlighted}` : undefined}
        tabIndex={isActive ? 0 : -1}
        onKeyDown={onKeyDown}
        className="flex flex-col gap-1 outline-none"
        style={{ opacity: isActive ? 1 : 0.5 }}
      >
        {prompt.options.map((option, i) => (
          <Option
            key={option.value}
            id={`ask-option-${i}`}
            option={option}
            selected={isActive ? i === highlighted : false}
            isActive={isActive}
            onHover={() => isActive && setHighlighted(i)}
            onSelect={() => isActive && submit(i)}
          />
        ))}
      </div>
    </div>
  );
}

type OptionProps = {
  id: string;
  option: AskOption;
  selected: boolean;
  isActive: boolean;
  onHover: () => void;
  onSelect: () => void;
};

function Option({ id, option, selected, isActive, onHover, onSelect }: OptionProps) {
  const variant = option.variant ?? 'neutral';
  return (
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={selected}
      tabIndex={-1}
      disabled={!isActive}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-xs font-medium transition-colors ${replyStyles[variant]} ${isActive ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ outline: selected ? '1px solid var(--color-accent)' : 'none' }}
    >
      <span aria-hidden="true" style={{ visibility: selected ? 'visible' : 'hidden' }}>
        ❯
      </span>
      <span>{option.label}</span>
    </button>
  );
}
