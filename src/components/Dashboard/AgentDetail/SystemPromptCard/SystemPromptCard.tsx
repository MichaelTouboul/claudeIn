import { Check, Copy, FileText } from 'lucide-react';
import { useState } from 'react';

import { IconButton } from '@/components/_ui/IconButton';
import { MarkdownBody } from '@/components/_ui/MarkdownBody';
import { Textarea } from '@/components/_ui/Textarea';

import { DetailCard } from '../DetailCard/DetailCard';

export type SystemPromptCardProps = {
  body: string;
  editing: boolean;
  /** Current draft body (edit mode). */
  value: string;
  onChange: (value: string) => void;
};

/** The "System prompt" card — renders the agent body, or a textarea in edit mode. */
export function SystemPromptCard({ body, editing, value, onChange }: SystemPromptCardProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore clipboard rejection
    }
  };

  return (
    <DetailCard
      icon={<FileText size={15} />}
      title="System prompt"
      action={
        editing ? null : (
          <IconButton aria-label="Copy prompt" size="sm" onClick={copy}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </IconButton>
        )
      }
    >
      {editing ? (
        <Textarea
          aria-label="System prompt"
          font="mono"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[280px] resize-y leading-relaxed"
        />
      ) : (
        <MarkdownBody content={body} />
      )}
    </DetailCard>
  );
}
