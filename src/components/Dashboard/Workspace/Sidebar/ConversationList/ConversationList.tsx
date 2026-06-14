import type { SessionSummary } from '@/hooks/useSessions';
import { ConversationStatus, useConversationStatusStore } from '@/store/dashboard/useConversationStatusStore';
import { useConversationTitlesStore } from '@/store/dashboard/useConversationTitlesStore';
import { effectivePinned, usePinnedStore } from '@/store/dashboard/usePinnedStore';
import { type InternalTab, useWorkspaceStore } from '@/store/useWorkspaceStore';

import { ConversationItem } from './ConversationItem/ConversationItem';

export type ConversationListProps = {
  sessions: SessionSummary[];
  // Refetch the session list after an app-owned mutation (archive/delete/pin)
  // so an archived/deleted active row disappears instead of going stale.
  onChanged: () => void;
};

function TierLabel({ label }: { label: string }) {
  return (
    <div
      className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest"
      style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
    >
      {label}
    </div>
  );
}

// A pinned session matches an open tab when the tab is the same conversation:
// a session tab carrying its sessionId/filePath, or a chat tab that stamped its
// claudeSessionId.
function tabMatchesSession(tab: InternalTab, s: SessionSummary): boolean {
  if (tab.kind === 'session') {
    return tab.sessionId === s.sessionId || tab.sessionFilePath === s.filePath;
  }
  return tab.claudeSessionId === s.sessionId;
}

export function ConversationList({ sessions, onChanged }: ConversationListProps) {
  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const activeDashboardId = useWorkspaceStore((s) => s.activeDashboardId);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const addTab = useWorkspaceStore((s) => s.addTab);
  const overrides = usePinnedStore((s) => s.overrides);
  // Explicit per-conversation status map (keyed by claudeSessionId). The dot
  // reads this per id instead of the agentName-keyed event sets; an absent id
  // resolves to idle (the single fallback).
  const statuses = useConversationStatusStore((s) => s.statuses);

  const active = dashboards.find((d) => d.id === activeDashboardId);
  const openTabs = active?.tabs ?? [];

  // PINNED group: every effectively-pinned session, shown even with no open tab.
  // Oldest pin first (stable); fall back to recency when pinnedAt is absent.
  const pinnedSessions = sessions
    .filter((s) => effectivePinned(overrides, s.sessionId, s.pinned))
    .slice()
    .sort((a, b) => {
      if (a.pinnedAt && b.pinnedAt) return a.pinnedAt.localeCompare(b.pinnedAt);
      if (a.pinnedAt) return -1;
      if (b.pinnedAt) return 1;
      return (b.lastActiveAt ?? '').localeCompare(a.lastActiveAt ?? '');
    });

  // OPEN group: the active dashboard's open conversation tabs, minus any that are
  // effectively pinned (those live in the Pinned group → dedup to one row).
  const openConvTabs = openTabs.filter((t) => {
    if (t.kind !== 'chat' && t.kind !== 'agent' && t.kind !== 'session') return false;
    const tabId = t.kind === 'session' ? t.sessionId : t.claudeSessionId;
    return !(tabId && effectivePinned(overrides, tabId, false)) && !pinnedSessions.some((s) => tabMatchesSession(t, s));
  });

  const openPinnedSession = (s: SessionSummary) => {
    const open = openTabs.find((t) => tabMatchesSession(t, s));
    if (open) {
      setActiveTab(open.id);
      return;
    }
    const liveTitle = useConversationTitlesStore.getState().conversationTitles[s.sessionId];
    const title =
      liveTitle?.userTitle ?? liveTitle?.aiTitle ?? s.title ?? s.firstPrompt ?? s.sessionId.slice(0, 8);
    addTab({ kind: 'session', title, sessionFilePath: s.filePath, sessionId: s.sessionId });
  };

  if (pinnedSessions.length === 0 && openConvTabs.length === 0) {
    return (
      <p className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
        No active conversations.
      </p>
    );
  }

  return (
    <div className="px-3 pb-2 space-y-0.5">
      {pinnedSessions.length > 0 ? (
        <>
          <TierLabel label="Pinned" />
          {pinnedSessions.map((s) => {
            const open = openTabs.find((t) => tabMatchesSession(t, s));
            return (
              <ConversationItem
                key={s.sessionId}
                convId={s.sessionId}
                title={s.title ?? s.firstPrompt ?? s.sessionId.slice(0, 8)}
                isActive={open ? open.id === active?.activeTabId : false}
                status={statuses[s.sessionId] ?? ConversationStatus.Idle}
                pinned
                onActivate={() => openPinnedSession(s)}
                onChanged={onChanged}
              />
            );
          })}
        </>
      ) : null}

      {openConvTabs.length > 0 ? (
        <>
          {pinnedSessions.length > 0 ? <TierLabel label="Open" /> : null}
          {openConvTabs.map((tab) => {
            const convId = tab.kind === 'session' ? tab.sessionId : tab.claudeSessionId;
            return (
              <ConversationItem
                key={tab.id}
                convId={convId}
                title={tab.title}
                isActive={tab.id === active?.activeTabId}
                status={convId ? statuses[convId] ?? ConversationStatus.Idle : ConversationStatus.Idle}
                pinned={false}
                onActivate={() => setActiveTab(tab.id)}
                onChanged={onChanged}
              />
            );
          })}
        </>
      ) : null}
    </div>
  );
}
