import { useCallback } from 'react';

import { type PanelTab, PanelTabKind, usePanelStore } from '@/store/usePanelStore';

import { PromptBar } from '../PromptBar/PromptBar';

/**
 * Read-only code view. Matches the plain monospace `<pre>` style of the chat
 * CodeBlock (no Shiki) so the panel reads consistently with the response body.
 * A shared PromptBar is pinned at the bottom for one-shot LLM transforms.
 */
export function CodeTab({ tab }: { tab: PanelTab }) {
  const updateTab = usePanelStore((s) => s.updateTab);
  const src = tab.kind === PanelTabKind.Code ? tab.payload.src : '';
  const lang = tab.kind === PanelTabKind.Code ? tab.payload.lang : null;

  // Replace the code in place with the transform result (raw code, no fences).
  const applyTransform = useCallback(
    (result: string) => {
      updateTab(tab.id, { kind: PanelTabKind.Code, payload: { lang, src: result } });
    },
    [updateTab, tab.id, lang],
  );

  // Defensive narrowing: TAB_BODY only routes code tabs here, but the union prop
  // keeps this component honest if it is ever rendered with another kind.
  if (tab.kind !== PanelTabKind.Code) return null;

  return (
    <div className="flex h-full min-h-0 flex-col">
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
      <PromptBar kind={PanelTabKind.Code} content={src} apply={applyTransform} />
    </div>
  );
}
