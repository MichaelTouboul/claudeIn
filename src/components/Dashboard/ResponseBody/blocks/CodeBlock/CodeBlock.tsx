import { codeTabId, PanelTabKind, usePanelStore } from '@/store/dashboard/usePanelStore';

import { BlockShell } from '../../BlockShell/BlockShell';
import type { BlockAction } from '../../responseBody.types';
import { CodeView } from '../codeHighlight/CodeView';

export type CodeBlockData = { lang: string | null; src: string };
export type CodeBlockProps = { data: CodeBlockData; raw: string };

// `raw` stays on CodeBlockProps for contract uniformity but is unused in this
// reference block, so it is not destructured (no unused-var lint error).
export function CodeBlock({ data }: CodeBlockProps) {
  const openPanel = usePanelStore((s) => s.open);

  // Open-in-panel stays a BlockShell hover action. Copy is owned by CodeView's
  // header button (always copies the RAW `data.src` — highlighting is display-only).
  const open: BlockAction = {
    id: 'open',
    label: 'Open',
    kind: 'local',
    run: () =>
      openPanel({
        id: codeTabId(data),
        kind: PanelTabKind.Code,
        title: 'Code',
        payload: { lang: data.lang, src: data.src },
      }),
  };

  return (
    <BlockShell>
      {(register) => {
        register([open]);
        return <CodeView src={data.src} lang={data.lang} />;
      }}
    </BlockShell>
  );
}
