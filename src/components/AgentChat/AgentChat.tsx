import { useEffect, useMemo,useRef, useState } from 'react';

import { useAgentChatActions } from '@/hooks/useAgentChatActions';
import { useAppStore } from '@/store/useAppStore';
import type { ChatMessage,SpawnSession } from '@/types/spawn.types';

import { AgentChatHeader } from './AgentChatHeader/AgentChatHeader';
import { AgentChatInput } from './AgentChatInput/AgentChatInput';
import { AgentChatMessages } from './AgentChatMessages/AgentChatMessages';
import { detectQuickReplies } from './quickReplies';
import { SLASH_COMMANDS } from './slashCommands';

type SpawnEvent =
  | { type: 'spawn_message'; sessionId: string; message: ChatMessage }
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
  const [queue, setQueue] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [spawning] = useState(false);
  const [showSlash, setShowSlash] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);
  const [waitingInput, setWaitingInput] = useState(false);
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ path: string; dataUrl: string | null }>>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sessionRef = useRef<SpawnSession | null>(null);
  sessionRef.current = session;
  const claudeSessionIdRef = useRef<string | null>(null);
  claudeSessionIdRef.current = claudeSessionId;
  const pendingUserMsgs = useRef<Set<string>>(new Set());
  const autoSentRef = useRef(false);

  const isRunning = session?.status === 'running';

  const { handleSend, handleAttach, handleQuickReply, handleKill } = useAgentChatActions({
    input, attachedFiles, awaitingResponse, session, isRunning: isRunning ?? false,
    agentName, projectPath, claudeSessionId, inputRef, pendingUserMsgs,
    setInput, setAttachedFiles, setShowSlash, setQueue, setMessages,
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
      const msg: ChatMessage = { role: 'user', content: next, timestamp: new Date().toISOString() };
      setMessages((m) => [...m, msg]);
      pendingUserMsgs.current.add(next);
      setAwaitingResponse(true);
      const resumeId = claudeSessionIdRef.current;
      window.api.spawn({ agent_name: agentName, mission: next, cwd: projectPath, resume_session_id: resumeId || undefined })
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
        const msg: ChatMessage = data.message;
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
    const msg: ChatMessage = { role: 'user', content: initialMessage, timestamp: new Date().toISOString() };
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

  const filteredCommands = SLASH_COMMANDS.filter((c) =>
    c.cmd.toLowerCase().includes(slashFilter.toLowerCase())
  );

  const handleInputChange = (val: string) => {
    setInput(val);
    if (val.startsWith('/')) {
      setShowSlash(true);
      setSlashFilter(val);
      setSlashIndex(0);
    } else {
      setShowSlash(false);
    }
  };

  const handleSelectSlash = (cmd: string) => {
    setInput(cmd + ' ');
    setShowSlash(false);
    inputRef.current?.focus();
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSlash && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIndex((i) => Math.min(i + 1, filteredCommands.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) { e.preventDefault(); handleSelectSlash(filteredCommands[slashIndex].cmd); return; }
      if (e.key === 'Escape') { setShowSlash(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

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
        inputRef={inputRef} onInputChange={handleInputChange} onKeyDown={handleKeyDown}
        onSelectSlash={handleSelectSlash} onRemoveAttachment={(i) => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))}
        onAttach={handleAttach} onSend={handleSend}
      />
    </div>
  );
}
