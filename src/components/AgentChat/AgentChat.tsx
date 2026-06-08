import { useEffect, useRef, useState } from 'react';

import { useAgentChatActions } from '@/hooks/useAgentChatActions';
import { useChatDropzone } from '@/hooks/useChatDropzone';
import { useCompactOnResume } from '@/hooks/useCompactOnResume';
import { useAppStore } from '@/store/useAppStore';
import { ConversationStatus, useConversationStatusStore } from '@/store/useConversationStatusStore';
import { useConversationTitlesStore } from '@/store/useConversationTitlesStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import type { ChatMessage,SpawnSession } from '@/types/spawn.types';

import { AgentChatHeader } from './AgentChatHeader/AgentChatHeader';
import { AgentChatInput } from './AgentChatInput/AgentChatInput';
import { AgentChatMessages } from './AgentChatMessages/AgentChatMessages';
import { parseAskPrompt } from './askPrompt';
import { ChatDropOverlay } from './ChatDropOverlay/ChatDropOverlay';
import { CompactStatusBanner } from './CompactStatusBanner/CompactStatusBanner';
import type { RichEditorHandle } from './RichEditor/RichEditor';
import type { QueueItem, SpawnEvent } from './types';

export type AgentChatProps = {
  agentName: string;
  // The owning InternalTab id, when this chat lives in a workspace tab. Lets us
  // stamp the tab with the conversation id once known (sidebar dedup/rename).
  tabId?: string;
  cwd?: string;
  resumeSessionId?: string;
  initialMessage?: string;
  // Pre-seed the transcript (e.g. resuming a viewed session: show the prior
  // history immediately). Seeded once on mount; live appends are not clobbered.
  initialMessages?: ChatMessage[];
  // Compact-on-resume: on mount, fire one automatic in-session `/compact` turn
  // on the resumed session BEFORE the user continues. Surfaced as a status
  // banner (never as a "/compact" user message); the input stays free
  // throughout. Mutually exclusive with `initialMessage`.
  compactOnResume?: boolean;
};

export function AgentChat({ agentName, tabId, cwd, resumeSessionId, initialMessage, initialMessages, compactOnResume }: AgentChatProps) {
  const selectedProjectPath = useAppStore((s) => s.selectedProject?.path);
  const retitleChatTab = useWorkspaceStore((s) => s.retitleChatTab);
  const setTabClaudeSessionId = useWorkspaceStore((s) => s.setTabClaudeSessionId);
  const setStatus = useConversationStatusStore((s) => s.setStatus);
  // cwd is the authoritative spawn directory (threaded from dashboard.cwd).
  // Legacy callers without a cwd prop fall back to the selected project path.
  const projectPath = cwd ?? selectedProjectPath;
  const [session, setSession] = useState<SpawnSession | null>(null);
  const [claudeSessionId, setClaudeSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => initialMessages ?? []);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [input, setInput] = useState('');
  const [spawning] = useState(false);
  const [waitingInput, setWaitingInput] = useState(false);
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ path: string; dataUrl: string | null }>>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RichEditorHandle | null>(null);
  const sessionRef = useRef<SpawnSession | null>(null);
  sessionRef.current = session;
  const claudeSessionIdRef = useRef<string | null>(null);
  claudeSessionIdRef.current = claudeSessionId;
  const pendingUserMsgs = useRef<Set<string>>(new Set());
  const autoSentRef = useRef(false);
  const queueRef = useRef<QueueItem[]>(queue);
  queueRef.current = queue;
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;
  // Stable indirection to sendNextFromQueue (defined below): lets the compact
  // hook + the once-mounted onEvent effect call the latest closure.
  const sendNextFromQueueRef = useRef<() => void>(() => {});
  const onCompactEventRef = useRef<(data: SpawnEvent) => void>(() => {});

  // Compact-on-resume: fire one automatic `/compact` turn on mount, surface its
  // status, keep the input free, and flush a message queued during compaction.
  const { compactStatus, compacting, onCompactEvent } = useCompactOnResume({
    compactOnResume, resumeSessionId, projectPath, agentName,
    setSession, setClaudeSessionId,
    flushQueue: () => sendNextFromQueueRef.current(),
  });
  onCompactEventRef.current = onCompactEvent;

  // The backend broadcasts the AI title (keyed by claudeSessionId) into the
  // shared titles store; surface it on this chat's tab via the existing
  // retitle mechanism so the open tab and the sidebar share one source.
  // Read userTitle and aiTitle through SEPARATE narrow selectors so the bridge
  // can tell a user rename (must always win) from an AI title (only-if-generic).
  const userTitle = useConversationTitlesStore((s) =>
    claudeSessionId ? s.conversationTitles[claudeSessionId]?.userTitle ?? null : null,
  );
  const aiTitle = useConversationTitlesStore((s) =>
    claudeSessionId ? s.conversationTitles[claudeSessionId]?.aiTitle ?? null : null,
  );

  const isRunning = session?.status === 'running';

  const { isDragging, dragHandlers } = useChatDropzone(setAttachedFiles);
  const { handleSend, handleAttach, onAnswer, handleKill, dispatchSlash } = useAgentChatActions({
    input, attachedFiles, awaitingResponse, compacting, session, isRunning: isRunning ?? false,
    agentName, projectPath, claudeSessionId, editorRef, pendingUserMsgs,
    setInput, setAttachedFiles, setQueue, setMessages,
    setAwaitingResponse, setWaitingInput, setSession, setClaudeSessionId,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, queue.length]);

  // When a turn finishes (`spawn_exit` — the app runs `claude --print`, one
  // process per turn), decide focus from the structured prompt in the last agent
  // message, the deterministic "input needed" signal `--print` never provided:
  //   • `choice` → the picker self-focuses via its `isActive` effect, so we
  //     deliberately do NOT focus the input (let the picker grab focus).
  //   • `text`   → focus this chat's input so the user can type a reply.
  //   • no prompt → do not steal focus.
  // Scoped to this instance's editorRef; guarded against a backgrounded window
  // (document.hidden); deferred to the next tick so focus lands after the DOM
  // settles; skipped while work auto-flows from the queue (next turn starting).
  const focusInputOnTurnComplete = () => {
    if (queueRef.current.length > 0) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    const msgs = messagesRef.current;
    const last = msgs[msgs.length - 1];
    if (!last || last.role !== 'assistant') return;
    const prompt = parseAskPrompt(last.content);
    if (!prompt) return;
    if (prompt.type === 'choice') return; // the picker takes focus itself
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  const sendNextFromQueue = () => {
    setQueue((prev) => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      const msg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: next.text, timestamp: new Date().toISOString() };
      setMessages((m) => [...m, msg]);
      pendingUserMsgs.current.add(next.text);
      setAwaitingResponse(true);
      const resumeId = claudeSessionIdRef.current;
      window.api.spawn({ agent_name: agentName, mission: next.text, cwd: projectPath, resume_session_id: resumeId || undefined })
        .then((data: SpawnSession) => {
          setSession(data);
          if (data.claudeSessionId) setClaudeSessionId(data.claudeSessionId);
        }).catch(() => setAwaitingResponse(false));
      return rest;
    });
  };
  sendNextFromQueueRef.current = sendNextFromQueue;

  useEffect(() => {
    const cleanup = window.api.onEvent((raw) => {
      const data = raw as SpawnEvent;
      const s = sessionRef.current;
      if (data.type === 'spawn_message' && s && data.localSessionId === s.localSessionId) {
        const msg: ChatMessage = { ...data.message, id: crypto.randomUUID() };
        if (msg.role === 'user' && pendingUserMsgs.current.has(msg.content)) {
          pendingUserMsgs.current.delete(msg.content);
          return;
        }
        setMessages((prev) => [...prev, msg]);
        setWaitingInput(false);
        if (msg.role === 'assistant') {
          setAwaitingResponse(false);
          setTimeout(() => sendNextFromQueue(), 100);
        }
      }
      if (data.type === 'spawn_input_request' && s && data.localSessionId === s.localSessionId) {
        setWaitingInput(true);
        setAwaitingResponse(false);
        setTimeout(() => sendNextFromQueue(), 100);
      }
      if (data.type === 'spawn_claude_session' && s && data.localSessionId === s.localSessionId) {
        setClaudeSessionId(data.claudeSessionId);
      }
      // Route to the compact-on-resume turn handler: it no-ops unless the event
      // belongs to that turn's process (flips the banner, releases `compacting`,
      // flushes a message queued during compaction). Kept before `spawn_exit`'s
      // normal close-out so the compact turn settles its own status first.
      onCompactEventRef.current(data);
      if (data.type === 'spawn_exit' && s && data.localSessionId === s.localSessionId) {
        setSession((prev) => prev ? { ...prev, status: data.status } : null);
        if (data.claudeSessionId) setClaudeSessionId(data.claudeSessionId);
        setWaitingInput(false);
        setAwaitingResponse(false);
        focusInputOnTurnComplete();
      }
    });
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Continue as is" resume entry: when a session is resumed WITHOUT an initial
  // message (the viewer's plain-resume choice), seed the claude session id so the
  // FIRST user message is sent as `--resume <id>` rather than spawning fresh.
  useEffect(() => {
    if (initialMessage) return; // auto-send path seeds it itself
    if (!resumeSessionId) return;
    setClaudeSessionId((prev) => prev ?? resumeSessionId);
  }, [resumeSessionId, initialMessage]);

  useEffect(() => {
    if (autoSentRef.current) return;
    if (!initialMessage || !resumeSessionId || !projectPath) return;
    autoSentRef.current = true;
    setClaudeSessionId(resumeSessionId);
    const msg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: initialMessage, timestamp: new Date().toISOString() };
    setMessages([msg]);
    pendingUserMsgs.current.add(initialMessage);
    setAwaitingResponse(true);
    window.api.spawn({ agent_name: agentName || undefined, mission: initialMessage, cwd: projectPath, resume_session_id: resumeSessionId })
      .then((data: SpawnSession) => {
        setSession(data);
        if (data.claudeSessionId) setClaudeSessionId(data.claudeSessionId);
      }).catch(() => setAwaitingResponse(false));
  }, [initialMessage, resumeSessionId, projectPath, agentName]);

  useEffect(() => {
    // The main/global chat spawns with an empty agentName; retitleChatTab +
    // matchesChatTab already handle that case, so do NOT gate on agentName here
    // (gating on it silently dropped the title for the main chat).
    if (userTitle) retitleChatTab(agentName, userTitle, true); // user rename always wins
    else if (aiTitle) retitleChatTab(agentName, aiTitle); // AI title only overwrites generic
  }, [userTitle, aiTitle, agentName, retitleChatTab]);

  // Once this live chat learns its on-disk conversation id, stamp it onto the
  // owning tab so the sidebar can dedup the open chat against its session row
  // and offer rename from ACTIVITY. Keyed precisely by tab id; idempotent.
  useEffect(() => {
    if (tabId && claudeSessionId) setTabClaudeSessionId(tabId, claudeSessionId);
  }, [tabId, claudeSessionId, setTabClaudeSessionId]);

  // Feed the authoritative per-conversation status into useConversationStatusStore
  // so the sidebar ACTIVITY dot is accurate PER claudeSessionId (not per agentName,
  // which several conversations share). Precedence: waiting-for-input wins over
  // running, otherwise running, otherwise idle. On unmount or when the id changes,
  // reset the prior id to idle so a closed/navigated-away conversation isn't stuck
  // pulsing.
  useEffect(() => {
    if (!claudeSessionId) return;
    setStatus(
      claudeSessionId,
      waitingInput
        ? ConversationStatus.Waiting
        : isRunning
          ? ConversationStatus.Running
          : ConversationStatus.Idle,
    );
    return () => setStatus(claudeSessionId, ConversationStatus.Idle);
  }, [claudeSessionId, isRunning, waitingInput, setStatus]);

  const handleInputChange = (val: string) => {
    setInput(val);
  };

  // Selecting a slash command from the autocomplete menu goes through the SAME
  // single dispatcher as the typed-send path (`dispatchSlash`): registry-driven,
  // `local` (e.g. `/clear`) runs in-app, `cli` forwards to claude. No hardcoded
  // `if (cmd === '/clear')` special-casing remains anywhere.
  const handleSelectSlash = (cmd: string) => {
    dispatchSlash(cmd);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRunning && awaitingResponse) {
        e.preventDefault();
        handleKill();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isRunning, awaitingResponse, handleKill]);

  return (
    <div className="relative h-full flex flex-col bg-surface-0 rounded-lg border border-border" {...dragHandlers}>
      {isDragging ? <ChatDropOverlay /> : null}
      <AgentChatHeader agentName={agentName} session={session} isRunning={isRunning ?? false} waitingInput={waitingInput} onKill={handleKill} />
      <AgentChatMessages
        agentName={agentName} messages={messages} session={session}
        isRunning={isRunning ?? false} waitingInput={waitingInput} awaitingResponse={awaitingResponse}
        queue={queue} onAnswer={onAnswer} scrollRef={scrollRef}
      />
      {compactStatus ? <CompactStatusBanner status={compactStatus} /> : null}
      <AgentChatInput
        input={input} attachedFiles={attachedFiles} waitingInput={waitingInput}
        isRunning={isRunning ?? false} spawning={spawning} session={session}
        claudeSessionId={claudeSessionId} agentName={agentName}
        editorRef={editorRef} onInputChange={handleInputChange}
        onSelectSlash={handleSelectSlash}
        onRemoveAttachment={(i) => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))}
        onAttach={handleAttach} onSend={handleSend}
      />
    </div>
  );
}
