import { Search } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/_ui/Input";
import type { SessionSummary } from "@/hooks/useSessions";
import { deriveSessionTitle, sessionTimeLabel } from "@/lib/utils";
import { ConversationStatus, useConversationStatusStore } from "@/store/dashboard/useConversationStatusStore";
import { useConversationTitlesStore } from "@/store/dashboard/useConversationTitlesStore";
import { useEventsStore } from "@/store/dashboard/useEventsStore";
import { effectivePinned, usePinnedStore } from "@/store/dashboard/usePinnedStore";
import { type InternalTab, useWorkspaceStore } from "@/store/useWorkspaceStore";

import { groupSessions } from "./groupSessions";
import { SessionRow } from "./SessionRow/SessionRow";

// How many history sessions render before the "Load more" affordance. Pinned
// rows are always shown; the cap applies to the flattened time-grouped history.
const INITIAL_VISIBLE = 12;
const LOAD_MORE_STEP = 20;

export type ConversationListProps = {
  sessions: SessionSummary[];
  // Refetch the session list after an app-owned mutation (archive/delete/pin)
  // so an archived/deleted active row disappears instead of going stale.
  onChanged: () => void;
};

function GroupLabel({ label }: { label: string }) {
  return (
    <div
      className="px-3 pt-3.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider"
      style={{ color: "var(--color-text-muted)" }}
    >
      {label}
    </div>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="px-3 pt-2 pb-1.5">
      <Input
        size="sm"
        placeholder="Search sessions…"
        leadingIcon={<Search size={13} />}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search sessions"
      />
    </div>
  );
}

// A session is "active" when the dashboard's active tab is the same
// conversation: a session tab carrying its sessionId/filePath, or a chat/agent
// tab that stamped its claudeSessionId.
function tabMatchesSession(tab: InternalTab, s: SessionSummary): boolean {
  if (tab.kind === "session") {
    return tab.sessionId === s.sessionId || tab.sessionFilePath === s.filePath;
  }
  return tab.claudeSessionId === s.sessionId;
}

export function ConversationList({ sessions, onChanged }: ConversationListProps) {
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(INITIAL_VISIBLE);

  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const activeDashboardId = useWorkspaceStore((s) => s.activeDashboardId);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const addTab = useWorkspaceStore((s) => s.addTab);
  const overrides = usePinnedStore((s) => s.overrides);
  const statuses = useConversationStatusStore((s) => s.statuses);
  // Backend-computed live context % per claudeSessionId — preferred over the
  // transcript-derived percent for a session that is actively growing. This is
  // the SAME backend value the live agent bar reads, so the two never diverge.
  const sessionContexts = useEventsStore((s) => s.sessionContexts);

  const active = dashboards.find((d) => d.id === activeDashboardId);
  const activeTab = active?.tabs.find((t) => t.id === active.activeTabId);

  const groups = groupSessions(sessions, overrides, query);

  // Open the conversation in the active dashboard as a `session` tab (deduped by
  // filePath in the store). Activate the existing tab if already open.
  const openSession = (s: SessionSummary) => {
    // Seed this conversation's persisted context % into the events store keyed by
    // its claudeSessionId, so the header + composer bar show the real usage the
    // instant the conversation is displayed — without waiting for a live
    // `session_context` event (which only fires for a running session). A live
    // value, if already present, is never overwritten (see seedSessionContext).
    useEventsStore.getState().seedSessionContext(s.sessionId, s.contextPercent);
    const open = active?.tabs.find((t) => tabMatchesSession(t, s));
    if (open) {
      setActiveTab(open.id);
      return;
    }
    const liveTitle = useConversationTitlesStore.getState().conversationTitles[s.sessionId];
    const title = deriveSessionTitle({
      sessionId: s.sessionId,
      title: s.title,
      firstPrompt: s.firstPrompt,
      userTitle: liveTitle?.userTitle,
      aiTitle: liveTitle?.aiTitle,
    });
    addTab({ kind: "session", title, sessionFilePath: s.filePath, sessionId: s.sessionId });
  };

  // Best-effort context %: the backend live value for this conversation (keyed by
  // its claudeSessionId) wins; otherwise the transcript-derived value listed with
  // the session. Both come from the one backend computation. null → omit the bar.
  const contextPercentFor = (s: SessionSummary): number | null => {
    const live = sessionContexts.get(s.sessionId);
    return live ?? s.contextPercent;
  };

  // Flatten the "Load more" cap across the time-grouped history while keeping
  // every Pinned row visible.
  let shown = 0;
  let hiddenCount = 0;
  const renderGroups = groups
    .map((g) => {
      if (g.label === "Pinned") return g;
      const room = Math.max(0, visible - shown);
      const slice = g.sessions.slice(0, room);
      hiddenCount += g.sessions.length - slice.length;
      shown += slice.length;
      return { label: g.label, sessions: slice };
    })
    .filter((g) => g.sessions.length > 0);

  if (renderGroups.length === 0) {
    return (
      <div className="flex flex-col">
        <SearchBox value={query} onChange={setQuery} />
        <p
          className="px-3 py-3 text-xs text-center"
          style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
        >
          {query ? "No sessions match." : "No conversations yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <SearchBox value={query} onChange={setQuery} />

      <div className="px-1 pb-2">
        {renderGroups.map((g) => (
          <div key={g.label}>
            <GroupLabel label={g.label} />
            <div className="space-y-0.5">
              {g.sessions.map((s) => (
                <SessionRow
                  key={s.sessionId}
                  session={s}
                  timeLabel={sessionTimeLabel(s.lastActiveAt)}
                  pinned={effectivePinned(overrides, s.sessionId, s.pinned)}
                  contextPercent={contextPercentFor(s)}
                  isActive={activeTab ? tabMatchesSession(activeTab, s) : false}
                  status={statuses[s.sessionId] ?? ConversationStatus.Idle}
                  onActivate={() => openSession(s)}
                  onChanged={onChanged}
                />
              ))}
            </div>
          </div>
        ))}

        {hiddenCount > 0 ? (
          <button
            onClick={() => setVisible((v) => v + LOAD_MORE_STEP)}
            className="mx-2 mt-2.5 w-[calc(100%-1rem)] px-3 py-2 text-[13px] rounded-md transition-colors"
            style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-surface-2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            Load more ({hiddenCount})
          </button>
        ) : null}
      </div>
    </div>
  );
}
