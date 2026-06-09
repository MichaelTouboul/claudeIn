import { type PanelTab, PanelTabKind } from '@/store/usePanelStore';

/**
 * Session-overview panel body. Phase 1 ships a placeholder that reads the bound
 * `claudeSessionId` from its {@link WorkflowPayload}; Phase 3 wires the view
 * switcher and the live Timeline/Tree/Board views on top of this shell.
 */
export function WorkflowView({ tab }: { tab: PanelTab }) {
  if (tab.kind !== PanelTabKind.Workflow) return null;
  const { claudeSessionId } = tab.payload;

  return (
    <div
      className="flex h-full min-h-0 flex-col items-center justify-center p-6 text-center"
      style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)' }}
      data-session-id={claudeSessionId ?? ''}
    >
      <span style={{ fontFamily: 'var(--font-mono)' }}>Session overview</span>
    </div>
  );
}
