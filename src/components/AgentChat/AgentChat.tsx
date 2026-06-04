import { useEffect, useRef, useState } from 'react';

import { useAgentChatActions } from '@/hooks/useAgentChatActions';
import { useAppStore } from '@/store/useAppStore';
import { useConversationTitlesStore } from '@/store/useConversationTitlesStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import type { ChatMessage,SpawnSession } from '@/types/spawn.types';

import { AgentChatHeader } from './AgentChatHeader/AgentChatHeader';
import { AgentChatInput } from './AgentChatInput/AgentChatInput';
import { AgentChatMessages } from './AgentChatMessages/AgentChatMessages';
import { parseAskPrompt } from './askPrompt';
import type { RichEditorHandle } from './RichEditor/RichEditor';
import type { QueueItem } from './types';

type SpawnEvent =
  // The backend doesn't generate ChatMessage.id — we mint it on receive.
  | { type: 'spawn_message'; localSessionId: string; message: Omit<ChatMessage, 'id'> }
  | { type: 'spawn_input_request'; localSessionId: string }
  | { type: 'spawn_claude_session'; localSessionId: string; claudeSessionId: string }
  | { type: 'spawn_exit'; localSessionId: string; status: SpawnSession['status']; claudeSessionId?: string };

export type AgentChatProps = {
  agentName: string;
  cwd?: string;
  resumeSessionId?: string;
  initialMessage?: string;
};

export function AgentChat({ agentName, cwd, resumeSessionId, initialMessage }: AgentChatProps) {
  const selectedProjectPath = useAppStore((s) => s.selectedProject?.path);
  const retitleChatTab = useWorkspaceStore((s) => s.retitleChatTab);
  // cwd is the authoritative spawn directory (threaded from dashboard.cwd).
  // Legacy callers without a cwd prop fall back to the selected project path.
  const projectPath = cwd ?? selectedProjectPath;
  const [session, setSession] = useState<SpawnSession | null>(null);
  const [claudeSessionId, setClaudeSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

  // The backend broadcasts the AI title (keyed by claudeSessionId) into the
  // shared titles store; surface it on this chat's tab via the existing
  // retitle mechanism so the open tab and the sidebar share one source.
  const aiTitle = useConversationTitlesStore((s) => {
    if (!claudeSessionId) return null;
    const t = s.conversationTitles[claudeSessionId];
    return t?.userTitle ?? t?.aiTitle ?? null;
  });

  const isRunning = session?.status === 'running';

  const { handleSend, handleAttach, onAnswer, handleKill } = useAgentChatActions({
    input, attachedFiles, awaitingResponse, session, isRunning: isRunning ?? false,
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
    if (aiTitle) retitleChatTab(agentName, aiTitle);
  }, [aiTitle, agentName, retitleChatTab]);

  const handleInputChange = (val: string) => {
    setInput(val);
  };

  // Executing a slash command reuses the answer path (sends the command text).
  const handleSelectSlash = (cmd: string) => {
    onAnswer(cmd);
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
    <div className="h-full flex flex-col bg-surface-0 rounded-lg border border-border">
      <AgentChatHeader agentName={agentName} session={session} isRunning={isRunning ?? false} waitingInput={waitingInput} onKill={handleKill} />
      <AgentChatMessages
        agentName={agentName} messages={messages} session={session}
        isRunning={isRunning ?? false} waitingInput={waitingInput} awaitingResponse={awaitingResponse}
        queue={queue} onAnswer={onAnswer} scrollRef={scrollRef}
      />
      <AgentChatInput
        input={input} attachedFiles={attachedFiles} waitingInput={waitingInput}
        isRunning={isRunning ?? false} spawning={spawning} session={session}
        editorRef={editorRef} onInputChange={handleInputChange}
        onSelectSlash={handleSelectSlash}
        onRemoveAttachment={(i) => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))}
        onAttach={handleAttach} onSend={handleSend}
      />
    </div>
  );
}
