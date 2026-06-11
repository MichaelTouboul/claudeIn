import { useCallback } from 'react';

import { ResponseBody } from '@/components/ResponseBody/ResponseBody';
import { type PanelTab, PanelTabKind, usePanelStore } from '@/store/usePanelStore';

import { PromptBar } from '../PromptBar/PromptBar';

/**
 * Rendered-markdown view, reusing the chat ResponseBody markdown path. A shared
 * PromptBar is pinned at the bottom for one-shot LLM transforms.
 */
export function TextTab({ tab }: { tab: PanelTab }) {
  const update = usePanelStore((s) => s.update);
  const text = tab.kind === PanelTabKind.Text ? tab.payload.text : '';

  // Replace the prose in place with the transform result (transformed markdown).
  const applyTransform = useCallback(
    (result: string) => {
      update({ kind: PanelTabKind.Text, payload: { text: result } });
    },
    [update],
  );

  if (tab.kind !== PanelTabKind.Text) return null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <ResponseBody content={text} />
      </div>
      <PromptBar kind={PanelTabKind.Text} content={text} apply={applyTransform} />
    </div>
  );
}
