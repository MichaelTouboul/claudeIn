import { Check, Table2 } from 'lucide-react';

import type { ToonMessageInfo } from '../../toonMessage';

type ToonMessageChipProps = {
  info: ToonMessageInfo;
};

/** Renders a sent user message's pasted-JSON attachment as a compact chip instead
 *  of the raw blob — "▤ TOON · ≈112 tokens ✓" (or "JSON" when the fence kept JSON).
 *  Styled like the accent slash-command pill. The token count is `≈` (the bundled
 *  tokenizer is not Claude's exact one). */
export function ToonMessageChip({ info }: ToonMessageChipProps) {
  const isToon = info.format === 'toon';
  return (
    <span
      className="inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{
        color: 'var(--color-accent)',
        backgroundColor: 'var(--color-accent-dim)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <Table2 size={11} />
      {isToon ? 'TOON' : 'JSON'} · ≈{info.tokens.toLocaleString()} tokens
      {isToon ? <Check size={11} /> : null}
    </span>
  );
}
