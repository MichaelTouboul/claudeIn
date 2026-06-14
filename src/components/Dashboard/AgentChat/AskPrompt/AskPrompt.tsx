import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { type AskOption, type AskPrompt as AskPromptType, replyStyles } from '../askPrompt';

type AskPromptProps = {
  prompt: AskPromptType;
  isActive: boolean;
  onAnswer: (value: string) => void;
};

/** Keyboard-navigable picker for a structured `cam-ask` prompt. `choice` renders a roving
 *  listbox (↑/↓ + Enter, 1–9 shortcuts, hover/click); `text` renders nothing (the chat input
 *  is the text affordance). Interactive only when `isActive`; otherwise inert + dimmed. */
export function AskPrompt({ prompt, isActive, onAnswer }: AskPromptProps) {
  const [highlighted, setHighlighted] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const options = prompt.type === 'choice' ? prompt.options : null;

  useEffect(() => {
    if (isActive && listRef.current) {
      const node = listRef.current;
      const id = setTimeout(() => node.focus(), 0);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [isActive]);

  if (prompt.type === 'text' || options === null) return null;

  const submit = (index: number) => {
    const option = options[index];
    if (option) onAnswer(option.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isActive) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      submit(highlighted);
    } else if (/^[1-9]$/.test(e.key)) {
      const index = Number(e.key) - 1;
      if (index < options.length) {
        e.preventDefault();
        submit(index);
      }
    }
  };

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
        {options.map((option, i) => (
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
