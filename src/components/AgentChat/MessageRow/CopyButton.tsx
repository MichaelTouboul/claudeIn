import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type CopyButtonProps = {
  // The raw text to place on the clipboard (the message content).
  text: string;
  // Extra positioning classes (e.g. left-aligned below the message content).
  className?: string;
};

// Desktop-app style copy affordance: a muted icon that turns accent on hover
// and flips to a check for ~1.5s after a successful copy. Local state only;
// the revert timeout is cleared on unmount so a fast unmount can't setState.
export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1500);
  };

  const color = copied || hovered ? 'var(--color-accent)' : 'var(--color-text-muted)';

  return (
    <button
      type="button"
      onClick={handleCopy}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={copied ? 'Copied' : 'Copy'}
      aria-label={copied ? 'Copied' : 'Copy message'}
      className={`opacity-0 group-hover:opacity-100 transition-opacity ${className ?? ''}`}
      style={{ color, lineHeight: 0 }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}
