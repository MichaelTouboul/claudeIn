import { Check, Copy, FileText } from 'lucide-react';
import { useState } from 'react';

export type PathChipProps = {
  path: string;
};

/** Mono file-path chip with a copy-to-clipboard affordance (✓ flash on copy). */
export function PathChip({ path }: PathChipProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(path);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard can reject (permissions / non-secure context) — ignore.
    }
  };

  return (
    <span className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs text-fg-subtle">
      <FileText size={12} className="shrink-0" />
      <span className="truncate">{path}</span>
      <button
        type="button"
        aria-label="Copy file path"
        onClick={copy}
        className="shrink-0 opacity-70 transition-colors hover:text-fg-muted hover:opacity-100"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </span>
  );
}
