import type { SessionSummary } from '@/hooks/useSessions';
import { useConversationTitlesStore } from '@/store/useConversationTitlesStore';
import { useEventsStore } from '@/store/useEventsStore';
import { effectivePinned, usePinnedStore } from '@/store/usePinnedStore';
import { useRunningStore } from '@/store/useRunningStore';
import { type InternalTab, useWorkspaceStore } from '@/store/useWorkspaceStore';

import { ConversationItem,type ConversationStatus } from './ConversationItem/ConversationItem';

export type ConversationListProps = {
  sessions: SessionSummary[];
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

// Live-event sets are keyed by the spawn's agentName; for the main chat that is
// "_main" (the tab carries an empty agentName). Normalize empty→"_main" for chat
// tabs so the dot can match; other kinds keep their literal agentName.
function tabAgentKey(tab: InternalTab): string {
  return tab.kind === 'chat' ? tab.agentName || '_main' : tab.agentName ?? '';
}

function statusFor(name: string, active: Set<string>, waiting: Set<string>): ConversationStatus {
  return waiting.has(name) ? 'waiting' : active.has(name) ? 'live' : 'idle';
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

export function ConversationList({ sessions }: ConversationListProps) {
  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const activeDashboardId = useWorkspaceStore((s) => s.activeDashboardId);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const addTab = useWorkspaceStore((s) => s.addTab);
  const activeAgents = useEventsStore((s) => s.activeAgents);
  const waitingAgents = useEventsStore((s) => s.waitingAgents);
  const overrides = usePinnedStore((s) => s.overrides);
  // Authoritative per-conversation running map (keyed by claudeSessionId). The
  // dot reads this instead of the agentName-keyed event sets.
  const running = useRunningStore((s) => s.running);

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
            const name = s.agentName ?? '';
            const open = openTabs.find((t) => tabMatchesSession(t, s));
            return (
              <ConversationItem
                key={s.sessionId}
                convId={s.sessionId}
                title={s.title ?? s.firstPrompt ?? s.sessionId.slice(0, 8)}
                isActive={open ? open.id === active?.activeTabId : false}
                running={running[s.sessionId] ?? false}
                status={statusFor(name, activeAgents, waitingAgents)}
                pinned
                onActivate={() => openPinnedSession(s)}
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
                running={convId ? running[convId] ?? false : false}
                status={statusFor(tabAgentKey(tab), activeAgents, waitingAgents)}
                pinned={false}
                onActivate={() => setActiveTab(tab.id)}
              />
            );
          })}
        </>
      ) : null}
    </div>
  );
}
