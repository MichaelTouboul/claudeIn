import { useCallback } from 'react';

import { AttachmentFormat } from '@/lib/types';
import { detectJson, encodeToon, estimateTokens } from '@/lib/utils';
import { type PanelTab, PanelTabKind } from '@/store/dashboard/usePanelStore';
import { useToonStore } from '@/store/useToonStore';

import { TokenDeltaBar } from './TokenDeltaBar';
import { ToonControls } from './ToonControls';

/**
 * Review/edit surface for a pasted-JSON attachment. Reads the attachment LIVE from
 * `useToonStore` by id (so chip edits and panel edits stay in sync), shows the
 * source JSON read-only and the TOON output editable, a token-delta bar, and the
 * send-format / re-convert / revert controls. All writes go back to the store.
 */
export function ToonTab({ tab }: { tab: PanelTab }) {
  const attachmentId = tab.kind === PanelTabKind.Toon ? tab.payload.attachmentId : '';
  const attachment = useToonStore((s) => s.attachments[attachmentId]);
  const update = useToonStore((s) => s.update);

  // Edit the TOON text in place; recompute its ≈ token count on every keystroke.
  const onToonChange = useCallback(
    (toon: string) => update(attachmentId, { toon, toonTokens: estimateTokens(toon) }),
    [attachmentId, update],
  );

  // Re-derive the TOON from the (read-only) source JSON. On any failure keep the
  // existing data — never lose the attachment.
  const onReconvert = useCallback(() => {
    if (!attachment) return;
    const detected = detectJson(attachment.sourceJson);
    if (!detected) return;
    try {
      const toon = encodeToon(detected.value);
      update(attachmentId, { toon, toonTokens: estimateTokens(toon) });
    } catch {
      /* keep current toon */
    }
  }, [attachment, attachmentId, update]);

  // Revert is the same recompute from the canonical source JSON (drops manual edits).
  const onRevert = onReconvert;

  const onToggleFormat = useCallback(
    (next: AttachmentFormat) => update(attachmentId, { format: next }),
    [attachmentId, update],
  );

  if (!attachment) {
    return <div className="p-3 text-sm text-fg-muted">This attachment is no longer available.</div>;
  }

  const saved = attachment.jsonTokens - attachment.toonTokens;
  const toonUnavailable = attachment.toon === null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <TokenDeltaBar jsonTokens={attachment.jsonTokens} toonTokens={attachment.toonTokens} saved={saved} />
      <ToonControls
        format={attachment.format}
        toonUnavailable={toonUnavailable}
        onToggleFormat={onToggleFormat}
        onReconvert={onReconvert}
        onRevert={onRevert}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <section className="flex min-h-0 flex-1 flex-col">
          <span className="mb-1 text-xs font-medium text-fg-muted">JSON</span>
          <pre className="min-h-0 flex-1 overflow-auto rounded border border-border bg-surface-1 p-2 text-xs font-mono text-fg whitespace-pre-wrap">
            {attachment.sourceJson}
          </pre>
        </section>
        <section className="flex min-h-0 flex-1 flex-col">
          <span className="mb-1 text-xs font-medium text-fg-muted">TOON {attachment.format === AttachmentFormat.Toon ? '· sending' : ''}</span>
          {toonUnavailable ? (
            <div className="rounded border border-border bg-surface-1 p-2 text-xs text-[var(--color-warning)]">
              TOON encoding failed — sending JSON.
            </div>
          ) : (
            <textarea
              value={attachment.toon ?? ''}
              onChange={(e) => onToonChange(e.target.value)}
              spellCheck={false}
              aria-label="TOON output"
              className="min-h-0 flex-1 resize-none rounded border border-border bg-surface-1 p-2 text-xs font-mono text-accent focus:outline-none focus:border-border-strong"
            />
          )}
        </section>
      </div>
    </div>
  );
}
