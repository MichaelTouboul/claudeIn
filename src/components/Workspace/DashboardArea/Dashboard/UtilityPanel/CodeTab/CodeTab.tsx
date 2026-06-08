import { type PanelTab, PanelTabKind } from '@/store/usePanelStore';

/**
 * Read-only code view. Matches the plain monospace `<pre>` style of the chat
 * CodeBlock (no Shiki) so the panel reads consistently with the response body.
 */
export function CodeTab({ tab }: { tab: PanelTab }) {
  // Defensive narrowing: TAB_BODY only routes code tabs here, but the union prop
  // keeps this component honest if it is ever rendered with another kind.
  if (tab.kind !== PanelTabKind.Code) return null;
  const { lang, src } = tab.payload;

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      {lang ? (
        <div className="px-3 pt-2 text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
          {lang}
        </div>
      ) : null}
      <pre
        className="overflow-x-auto px-3 pb-3 pt-1 text-sm leading-relaxed"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}
      >
        <code>{src}</code>
      </pre>
    </div>
  );
}
