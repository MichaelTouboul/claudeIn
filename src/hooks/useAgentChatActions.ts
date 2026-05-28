import { type RefObject, useCallback } from 'react';

import type { QueueItem } from '@/components/AgentChat/types';
import type { ChatMessage, SpawnSession } from '@/types/spawn.types';

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;
type AttachedFile = { path: string; dataUrl: string | null };

type UseAgentChatActionsParams = {
  input: string;
  attachedFiles: AttachedFile[];
  awaitingResponse: boolean;
  session: SpawnSession | null;
  isRunning: boolean;
  agentName: string;
  projectPath: string | undefined;
  claudeSessionId: string | null;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  pendingUserMsgs: RefObject<Set<string>>;
  setInput: SetState<string>;
  setAttachedFiles: SetState<AttachedFile[]>;
  setShowSlash: SetState<boolean>;
  setQueue: SetState<QueueItem[]>;
  setMessages: SetState<ChatMessage[]>;
  setAwaitingResponse: SetState<boolean>;
  setWaitingInput: SetState<boolean>;
  setSession: SetState<SpawnSession | null>;
  setClaudeSessionId: SetState<string | null>;
};

export function useAgentChatActions({
  input,
  attachedFiles,
  awaitingResponse,
  session,
  isRunning,
  agentName,
  projectPath,
  claudeSessionId,
  inputRef,
  pendingUserMsgs,
  setInput,
  setAttachedFiles,
  setShowSlash,
  setQueue,
  setMessages,
  setAwaitingResponse,
  setWaitingInput,
  setSession,
  setClaudeSessionId,
}: UseAgentChatActionsParams) {
  const handleSend = useCallback(async () => {
    if (!input.trim() && attachedFiles.length === 0) return;
    const text = input.trim();
    const filePaths = attachedFiles.map((f) => f.path).join('\n');
    const fullText = filePaths ? (text ? text + '\n' + filePaths : filePaths) : text;

    setInput('');
    setAttachedFiles([]);
    setShowSlash(false);
    inputRef.current?.focus();

    if (awaitingResponse) {
      setQueue((prev) => [...prev, { id: crypto.randomUUID(), text: fullText }]);
      return;
    }

    const msg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: fullText, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, msg]);
    setAwaitingResponse(true);
    setWaitingInput(false);

    if (session && isRunning) {
      pendingUserMsgs.current.add(fullText);
      await window.api.sendInput(session.id, fullText);
    } else {
      pendingUserMsgs.current.add(fullText);
      try {
        const data = await window.api.spawn({ agent_name: agentName, mission: fullText, cwd: projectPath, resume_session_id: claudeSessionId || undefined });
        setSession(data);
        if (data.claudeSessionId) setClaudeSessionId(data.claudeSessionId);
      } catch {
        setAwaitingResponse(false);
      }
    }
  }, [input, attachedFiles, awaitingResponse, session, isRunning, agentName, projectPath, claudeSessionId, inputRef, pendingUserMsgs, setInput, setAttachedFiles, setShowSlash, setQueue, setMessages, setAwaitingResponse, setWaitingInput, setSession, setClaudeSessionId]);

  const handleAttach = useCallback(async () => {
    const paths = await window.api.openFilePicker();
    if (paths.length === 0) return;

    const imageExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];
    const newFiles: AttachedFile[] = [];

    for (const p of paths) {
      const ext = p.slice(p.lastIndexOf('.')).toLowerCase();
      if (imageExts.includes(ext)) {
        const dataUrl = await window.api.readImageAsDataUrl(p);
        newFiles.push({ path: p, dataUrl });
      } else {
        newFiles.push({ path: p, dataUrl: null });
      }
    }

    setAttachedFiles((prev) => [...prev, ...newFiles]);
    inputRef.current?.focus();
  }, [inputRef, setAttachedFiles]);

  const handleQuickReply = useCallback(async (value: string) => {
    const msg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: value, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, msg]);
    pendingUserMsgs.current.add(value);
    setWaitingInput(false);
    setAttachedFiles([]);
    setAwaitingResponse(true);

    if (session && isRunning) {
      await window.api.sendInput(session.id, value);
    } else {
      try {
        const data = await window.api.spawn({ agent_name: agentName, mission: value, cwd: projectPath, resume_session_id: claudeSessionId || undefined });
        setSession(data);
        if (data.claudeSessionId) setClaudeSessionId(data.claudeSessionId);
      } catch {
        setAwaitingResponse(false);
      }
    }
  }, [session, isRunning, agentName, projectPath, claudeSessionId, pendingUserMsgs, setMessages, setWaitingInput, setAttachedFiles, setAwaitingResponse, setSession, setClaudeSessionId]);

  const handleKill = useCallback(async () => {
    if (!session) return;
    await window.api.killSession(session.id);
  }, [session]);

  return { handleSend, handleAttach, handleQuickReply, handleKill };
}
