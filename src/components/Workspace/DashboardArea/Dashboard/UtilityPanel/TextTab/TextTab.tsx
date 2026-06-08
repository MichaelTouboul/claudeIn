import { ResponseBody } from '@/components/ResponseBody/ResponseBody';
import { type PanelTab, PanelTabKind } from '@/store/usePanelStore';

/** Rendered-markdown view, reusing the chat ResponseBody markdown path. */
export function TextTab({ tab }: { tab: PanelTab }) {
  if (tab.kind !== PanelTabKind.Text) return null;

  return (
    <div className="min-h-0 flex-1 overflow-auto p-3">
      <ResponseBody content={tab.payload.text} />
    </div>
  );
}
