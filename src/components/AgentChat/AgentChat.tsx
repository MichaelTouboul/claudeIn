import { useEffect, useMemo,useRef, useState } from 'react';

import { useAgentChatActions } from '@/hooks/useAgentChatActions';
import { useAppStore } from '@/store/useAppStore';
import type { ChatMessage,SpawnSession } from '@/types/spawn.types';

import { AgentChatHeader } from './AgentChatHeader/AgentChatHeader';
import { AgentChatInput } from './AgentChatInput/AgentChatInput';
import { AgentChatMessages } from './AgentChatMessages/AgentChatMessages';
import { detectQuickReplies } from './quickReplies';
import type { RichEditorHandle } from './RichEditor/RichEditor';
import { matchSlashQuery } from './RichEditor/serialize';
import { SLASH_COMMANDS } from './slashCommands';
import type { QueueItem } from './types';

type SpawnEvent =
  // The backend doesn't generate ChatMessage.id — we mint it on receive.
  | { type: 'spawn_message'; sessionId: string; message: Omit<ChatMessage, 'id'> }
  | { type: 'spawn_input_request'; sessionId: string }
  | { type: 'spawn_claude_session'; sessionId: string; claudeSessionId: string }
  | { type: 'spawn_exit'; sessionId: string; status: SpawnSession['status']; claudeSessionId?: string };

export type AgentChatProps = {
  agentName: string;
  resumeSessionId?: string;
  initialMessage?: string;
};

export function AgentChat({ agentName, resumeSessionId, initialMessage }: AgentChatProps) {
  const projectPath = useAppStore((s) => s.selectedProject?.path);
  const [session, setSession] = useState<SpawnSession | null>(null);
  const [claudeSessionId, setClaudeSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [input, setInput] = useState('');
  const [plainText, setPlainText] = useState('');
  const [spawning] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
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

  const isRunning = session?.status === 'running';

  const { handleSend, handleAttach, handleQuickReply, handleKill } = useAgentChatActions({
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
      if (data.type === 'spawn_message' && s && data.sessionId === s.id) {
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
      if (data.type === 'spawn_input_request' && s && data.sessionId === s.id) {
        setWaitingInput(true);
        setAwaitingResponse(false);
        setTimeout(() => sendNextFromQueue(), 100);
      }
      if (data.type === 'spawn_claude_session' && s && data.sessionId === s.id) {
        setClaudeSessionId(data.claudeSessionId);
      }
      if (data.type === 'spawn_exit' && s && data.sessionId === s.id) {
        setSession((prev) => prev ? { ...prev, status: data.status } : null);
        if (data.claudeSessionId) setClaudeSessionId(data.claudeSessionId);
        setWaitingInput(false);
        setAwaitingResponse(false);
      }
    });
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const lastAssistantMsg = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i];
    }
    return null;
  }, [messages]);

  const quickReplies = useMemo(() => {
    if (!lastAssistantMsg) return null;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'user') return null;
    return detectQuickReplies(lastAssistantMsg.content);
  }, [lastAssistantMsg, messages]);

  const slashQuery = matchSlashQuery(plainText);
  const showSlash = slashQuery !== null;
  const filteredCommands = slashQuery === null
    ? []
    : SLASH_COMMANDS.filter((c) => c.cmd.slice(1).startsWith(slashQuery));

  useEffect(() => {
    setSlashIndex(0);
  }, [slashQuery]);

  const handleInputChange = (val: string) => {
    setInput(val);
  };

  const handlePlainTextChange = (plain: string) => {
    setPlainText(plain);
  };

  const handleSelectSlash = (cmd: string) => {
    handleQuickReply(cmd);
    editorRef.current?.clear();
    editorRef.current?.focus();
  };

  const onSlashEnter = (): boolean => {
    if (showSlash && filteredCommands.length > 0) {
      handleSelectSlash(filteredCommands[slashIndex].cmd);
      return true;
    }
    return false;
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
        queue={queue} quickReplies={quickReplies} onQuickReply={handleQuickReply} scrollRef={scrollRef}
      />
      <AgentChatInput
        input={input} attachedFiles={attachedFiles} waitingInput={waitingInput}
        isRunning={isRunning ?? false} spawning={spawning} session={session}
        showSlash={showSlash} slashIndex={slashIndex} filteredCommands={filteredCommands}
        editorRef={editorRef} onInputChange={handleInputChange} onPlainTextChange={handlePlainTextChange}
        onSlashEnter={onSlashEnter} onSelectSlash={handleSelectSlash}
        onRemoveAttachment={(i) => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))}
        onAttach={handleAttach} onSend={handleSend}
      />
    </div>
  );
}
