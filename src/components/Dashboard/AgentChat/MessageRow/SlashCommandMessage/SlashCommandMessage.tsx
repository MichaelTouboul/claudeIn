import { Check, TriangleAlert, Zap } from 'lucide-react';

import type { SlashCommandMessage as SlashCommandMessageType } from '../../slashCommand';

type SlashCommandMessageProps = {
  parsed: SlashCommandMessageType;
};

/** Renders a parsed slash-command transcript message:
 *  - invocation → an accent "chip" pill (⚡ /name); args (the user's real typed prose) below.
 *  - output → a subtle muted inline status note (stdout: accent + Check; stderr: danger + alert).
 *  - caveat → nothing.
 *  Caller already decided this is plumbing (via `parseSlashCommand`); we only style it. */
export function SlashCommandMessage({ parsed }: SlashCommandMessageProps) {
  if (parsed.kind === 'caveat') return null;

  if (parsed.kind === 'output') {
    if (parsed.text.length === 0) return null;
    const isErr = parsed.stream === 'stderr';
    const color = isErr ? 'var(--color-danger)' : 'var(--color-text-muted)';
    return (
      <div className="ml-5 flex items-center gap-1.5 text-xs" style={{ color }}>
        {isErr ? <TriangleAlert size={12} /> : <Check size={12} />}
        <span className="font-mono">{parsed.text}</span>
      </div>
    );
  }

  return (
    <div className="ml-5 flex flex-col gap-1">
      <span
        className="inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
        style={{
          color: 'var(--color-accent)',
          backgroundColor: 'var(--color-accent-dim)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <Zap size={11} />
        {parsed.name}
      </span>
      {parsed.args ? (
        <pre className="text-sm text-accent whitespace-pre-wrap font-mono leading-relaxed">
          {parsed.args}
        </pre>
      ) : null}
    </div>
  );
}
