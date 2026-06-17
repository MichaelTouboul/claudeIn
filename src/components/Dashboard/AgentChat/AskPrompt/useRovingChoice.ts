import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

import type { AskOption } from '../askPrompt';

export type RovingChoice = {
  highlighted: number;
  setHighlighted: (index: number) => void;
  listRef: React.RefObject<HTMLDivElement | null>;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  submit: (index: number) => void;
};

/** Shared roving-listbox behavior for a `cam-ask` choice: ↑/↓ move + clamp,
 *  Enter submits the highlight, 1–9 jump-submit, and focus moves to the list
 *  when the prompt becomes active. Drives both the plain picker and the
 *  authorization card so they stay keyboard-identical. */
export function useRovingChoice(
  options: AskOption[],
  isActive: boolean,
  onAnswer: (value: string) => void,
): RovingChoice {
  const [highlighted, setHighlighted] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && listRef.current) {
      const node = listRef.current;
      const id = setTimeout(() => node.focus(), 0);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [isActive]);

  const submit = (index: number) => {
    const option = options[index];
    if (option) onAnswer(option.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isActive) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(Math.min(highlighted + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(Math.max(highlighted - 1, 0));
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

  return { highlighted, setHighlighted, listRef, onKeyDown, submit };
}
