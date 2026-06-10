import { useEffect, useRef, useState } from "react";

import type { SessionSummary } from "@/hooks/useSessions";
import { useProject } from "@/store/ProjectContext";
import { useConversationTitlesStore } from "@/store/useConversationTitlesStore";
import { useEventsStore } from "@/store/useEventsStore";
import { effectivePinned, usePinnedStore } from "@/store/usePinnedStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

import { LiveSessionRow } from "./LiveSessionRow/LiveSessionRow";
import { LoadMoreModal } from "./LoadMoreModal/LoadMoreModal";
import { RecentSessionRow } from "./RecentSessionRow/RecentSessionRow";
import { capRecent, partitionSessions } from "./utils";

const REFETCH_DEBOUNCE_MS = 400;

export type SessionsPanelProps = {
  sessions: SessionSummary[];
  loading: boolean;
  refresh: () => Promise<void> | void;
};

function TierLabel({ label }: { label: string }) {
  return (
    <div
      className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest"
      style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
    >
      {label}
    </div>
  );
}

export function SessionsPanel({ sessions, loading, refresh }: SessionsPanelProps) {
  const { projectPath } = useProject();
  const activeAgents = useEventsStore((s) => s.activeAgents);
  const agentContexts = useEventsStore((s) => s.agentContexts);
  const addTab = useWorkspaceStore((s) => s.addTab);
  // Narrow: only the active dashboard's tabs drive the open-conversation dedup.
  const openTabs = useWorkspaceStore(
    (s) => s.dashboards.find((d) => d.id === s.activeDashboardId)?.tabs,
  );
  // Optimistic pin overrides — effectively-pinned conversations are excluded
  // from SESSIONS entirely; they live in the ACTIVITY list's Pinned group.
  const pinnedOverrides = usePinnedStore((s) => s.overrides);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Live list refresh: watch the active scope, then debounce-refetch on each
  // `session_activity` push so the tiers stay current without thrashing.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!projectPath) return;
    void window.api.watchSessions(projectPath);
    const off = window.api.onEvent((raw) => {
      const data = raw as { type?: string };
      if (data.type !== "session_activity") return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void refresh();
      }, REFETCH_DEBOUNCE_MS);
    });
    return () => {
      off();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void window.api.unwatchSessions(projectPath);
    };
  }, [projectPath, refresh]);

  // Hide conversations already open in a tab of the active dashboard so SESSIONS
  // never duplicates ACTIVITY. A conversation is "open" if a session tab carries
  // its sessionId/filePath, or a live chat tab has stamped its claudeSessionId.
  const openConversationIds = new Set<string>();
  const openFilePaths = new Set<string>();
  for (const tab of openTabs ?? []) {
    if (tab.kind === "session") {
      if (tab.sessionId) openConversationIds.add(tab.sessionId);
      if (tab.sessionFilePath) openFilePaths.add(tab.sessionFilePath);
    } else if (tab.claudeSessionId) {
      openConversationIds.add(tab.claudeSessionId);
    }
  }
  // Effectively-pinned conversations move to ACTIVITY's Pinned group, so they are
  // dropped from SESSIONS entirely. Everything else open is hidden to avoid
  // duplicating ACTIVITY; non-pinned, non-open sessions form the history.
  const visibleSessions = sessions.filter(
    (s) =>
      !effectivePinned(pinnedOverrides, s.sessionId, s.pinned) &&
      !openConversationIds.has(s.sessionId) &&
      !openFilePaths.has(s.filePath),
  );

  const { live, recent, archived } = partitionSessions(visibleSessions, activeAgents);
  // Live sessions are always inline. The non-live recent history is capped to the
  // 10 most recent inline; the overflow (plus archived) goes to the Load-more modal.
  const { inline, overflow } = capRecent(recent);

  // Open the conversation in the MAIN dashboard area as a `session` tab
  // (deduped by filePath in the store), and keep the row highlighted. Title =
  // the AI title, falling back to the first prompt / short id.
  const handleSelect = (filePath: string) => {
    const match = sessions.find((s) => s.filePath === filePath);
    if (!match) {
      setSelectedId(null);
      return;
    }
    setSelectedId(match.sessionId);
    const liveTitle = useConversationTitlesStore.getState().conversationTitles[match.sessionId];
    const title =
      liveTitle?.userTitle ?? liveTitle?.aiTitle ?? match.title ?? match.firstPrompt ?? match.sessionId.slice(0, 8);
    addTab({ kind: "session", title, sessionFilePath: match.filePath, sessionId: match.sessionId });
  };

  if (loading) {
    return <p className="text-xs text-center py-4" style={{ color: "var(--color-text-muted)" }}>Loading sessions…</p>;
  }

  return (
    <div className="flex flex-col">
      {live.length > 0 ? (
        <>
          <TierLabel label="Live" />
          <div className="px-1 space-y-0.5">
            {live.map((s) => (
              <LiveSessionRow
                key={s.sessionId}
                session={s}
                context={s.agentName ? agentContexts.get(s.agentName) : undefined}
                selected={selectedId === s.sessionId}
                onSelect={handleSelect}
                piloted={Boolean(s.agentName && activeAgents.has(s.agentName))}
                onChanged={refresh}
              />
            ))}
          </div>
        </>
      ) : null}

      <TierLabel label="Recent" />
      <div className="px-1 space-y-0.5">
        {inline.length > 0 ? (
          inline.map((s) => (
            <RecentSessionRow
              key={s.sessionId}
              session={s}
              selected={selectedId === s.sessionId}
              onSelect={handleSelect}
              onChanged={refresh}
            />
          ))
        ) : (
          <p className="text-xs text-center py-3" style={{ color: "var(--color-text-muted)" }}>
            No recent sessions
          </p>
        )}
      </div>

      {overflow.length > 0 || archived.length > 0 ? (
        <button
          onClick={() => setModalOpen(true)}
          className="mx-3 mt-2 mb-1 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors"
          style={{
            color: "var(--color-text-secondary)",
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border-subtle)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-surface-3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--color-surface-2)";
          }}
        >
          Load more ({overflow.length + archived.length})
        </button>
      ) : null}

      <LoadMoreModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        sessions={overflow}
        archived={archived}
        selectedId={selectedId}
        onSelect={handleSelect}
        onChanged={refresh}
      />
    </div>
  );
}
