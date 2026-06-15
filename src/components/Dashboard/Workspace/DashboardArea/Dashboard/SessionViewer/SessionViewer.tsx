import { useEffect, useRef, useState } from "react";

import { AgentChat } from "@/components/Dashboard/AgentChat/AgentChat";
import { useConversationTail } from "@/hooks/useConversationTail";
import type { ChatMessage } from "@/lib/types";

import { ResumeChoice } from "./ResumeChoice/ResumeChoice";
import { recommendResumeOption } from "./ResumeChoice/resumeRecommendation";
import { SessionMessageRow } from "./SessionMessageRow/SessionMessageRow";

export type SessionViewerProps = {
  filePath: string;
  sessionId: string;
  title: string;
  cwd: string;
};

const SCROLL_BOTTOM_SLACK_PX = 64;

function CenteredNote({ label }: { label: string }) {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <p className="text-sm" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-sans)" }}>
        {label}
      </p>
    </div>
  );
}

/**
 * Read-only transcript viewer opened in the main dashboard area as a `session`
 * tab. Initial render comes from `getSessionConversation`; live appends arrive
 * via the conversation tail (deduped by uuid in `useConversationTail`). Auto-
 * scrolls to the newest message unless the user has scrolled up.
 */
export function SessionViewer({ filePath, sessionId, title, cwd }: SessionViewerProps) {
  const { messages, meta, state } = useConversationTail(filePath);
  // Recommend compact only for heavy conversations (near the window limit),
  // mirroring terminal Claude Code's auto-compact. While unloaded (meta null),
  // the safe non-destructive default ('continue') applies.
  const recommended = recommendResumeOption(meta ? { ...meta, messages } : null);
  // null = undecided; 'continue' = plain resume; 'compact' = resume and run an
  // automatic /compact turn first (compact-on-resume). Both modes render the
  // SAME live AgentChat seeded with the prior transcript — 'compact' just adds
  // the `compactOnResume` flag.
  const [resumeMode, setResumeMode] = useState<null | "continue" | "compact">(null);

  // Skip the Compact/Continue prompt when there's no reason to compact: once the
  // conversation is loaded and the recommendation is 'continue', drop straight
  // into the (non-destructive) chat. We only ever surface ResumeChoice when the
  // recommendation is 'compact'. Auto-deciding before paint keeps a light
  // conversation from flashing the choice screen.
  useEffect(() => {
    if (resumeMode !== null) return;
    if (state !== "loaded") return;
    if (recommended === "continue") setResumeMode("continue");
  }, [resumeMode, state, recommended]);

  const scrollRef = useRef<HTMLDivElement>(null);
  // Track whether the user is pinned to the bottom; only auto-scroll when so.
  const pinnedRef = useRef(true);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedRef.current = distanceFromBottom <= SCROLL_BOTTOM_SLACK_PX;
  };

  useEffect(() => {
    if (!pinnedRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Resume the on-disk session into a live chat. AgentChat seeds its claude
  // session id from `resumeSessionId`, so the first message is sent as
  // `claude --resume <sessionId>` rather than a fresh spawn. In 'compact' mode
  // AgentChat fires one `/compact` turn on mount before the user continues.
  if (resumeMode) {
    // Seed the live chat with the transcript the user just saw, so the prior
    // history shows immediately. Drop tool-only rows (empty content) that would
    // render as blank bubbles. The backend later streams only NEW turns on
    // --resume, so this snapshot is not duplicated.
    const seedMessages: ChatMessage[] = messages
      .filter((m) => m.content.trim() !== "")
      .map((m) => ({
        id: m.uuid || crypto.randomUUID(),
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));
    return (
      <div className="flex-1 min-h-0 h-full p-3">
        <AgentChat
          key={`resume-${sessionId}`}
          agentName=""
          cwd={cwd}
          resumeSessionId={sessionId}
          initialMessages={seedMessages}
          compactOnResume={resumeMode === "compact"}
        />
      </div>
    );
  }

  if (state === "loading") {
    return <CenteredNote label="Loading conversation…" />;
  }
  if (state === "not-found") {
    return <CenteredNote label="Conversation not found on disk." />;
  }
  // Loaded but recommendation is 'continue': the effect above is about to enter
  // continue mode. Render the placeholder (not the choice screen) for this one
  // frame so a light conversation never flashes the Compact/Continue prompt.
  if (recommended !== "compact") {
    return <CenteredNote label="Loading conversation…" />;
  }

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col">
      <div
        className="px-4 py-2 border-b shrink-0"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }}>
          {title || sessionId.slice(0, 8)}
        </span>
      </div>
      <ResumeChoice
        recommended={recommended}
        onContinue={() => setResumeMode("continue")}
        onCompact={() => setResumeMode("compact")}
      />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4"
      >
        {messages.length === 0 ? (
          <CenteredNote label="No messages in this conversation yet." />
        ) : (
          messages.map((m) => <SessionMessageRow key={m.uuid} msg={m} />)
        )}
      </div>
    </div>
  );
}
