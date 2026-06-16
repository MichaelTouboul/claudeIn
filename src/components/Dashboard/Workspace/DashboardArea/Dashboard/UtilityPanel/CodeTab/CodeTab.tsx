import { useCallback } from 'react';

import { CodeView } from '@/components/Dashboard/ResponseBody/blocks/codeHighlight/CodeView';
import { type PanelTab, PanelTabKind, usePanelStore } from '@/store/dashboard/usePanelStore';

import { PromptBar } from '../PromptBar/PromptBar';

/**
 * Read-only code view. Reuses the chat CodeBlock's design-system `CodeView`
 * (language header + line-number gutter + syntax highlighting) so the panel
 * reads identically to the response body. A shared PromptBar is pinned at the
 * bottom for one-shot LLM transforms — it always operates on the raw `src`.
 */
export function CodeTab({ tab }: { tab: PanelTab }) {
  const update = usePanelStore((s) => s.update);
  const src = tab.kind === PanelTabKind.Code ? tab.payload.src : '';
  const lang = tab.kind === PanelTabKind.Code ? tab.payload.lang : null;

  // Replace the code in place with the transform result (raw code, no fences).
  const applyTransform = useCallback(
    (result: string) => {
      update({ kind: PanelTabKind.Code, payload: { lang, src: result } });
    },
    [update, lang],
  );

  // Defensive narrowing: TAB_BODY only routes code tabs here, but the union prop
  // keeps this component honest if it is ever rendered with another kind.
  if (tab.kind !== PanelTabKind.Code) return null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <CodeView src={src} lang={lang} />
      </div>
      <PromptBar kind={PanelTabKind.Code} content={src} apply={applyTransform} />
    </div>
  );
}
