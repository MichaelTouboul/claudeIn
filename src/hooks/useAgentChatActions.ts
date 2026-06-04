import { type RefObject, useCallback } from 'react';

import type { RichEditorHandle } from '@/components/AgentChat/RichEditor/RichEditor';
import type { QueueItem } from '@/components/AgentChat/types';
import type { ChatMessage, SpawnSession } from '@/types/spawn.types';

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;
type AttachedFile = { path: string; dataUrl: string | null };

type UseAgentChatActionsParams = {
  input: string;
  attachedFiles: AttachedFile[];
  awaitingResponse: boolean;
  // True while the one-shot compact-on-resume `/compact` turn is in flight. The
  // input stays free (we never set `awaitingResponse` for it), so we route any
  // message typed during compaction into the queue here — it flushes via
  // `sendNextFromQueue` once the compact turn exits, never a 2nd concurrent
  // `--resume` on the same session.
  compacting: boolean;
  session: SpawnSession | null;
  isRunning: boolean;
  agentName: string;
  projectPath: string | undefined;
  claudeSessionId: string | null;
  editorRef: RefObject<RichEditorHandle | null>;
  pendingUserMsgs: RefObject<Set<string>>;
  setInput: SetState<string>;
  setAttachedFiles: SetState<AttachedFile[]>;
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
  compacting,
  session,
  isRunning,
  agentName,
  projectPath,
  claudeSessionId,
  editorRef,
  pendingUserMsgs,
  setInput,
  setAttachedFiles,
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

    // `/clear` (exact, no args — like the terminal's `/clear`) is intercepted
    // here: it INSTANTLY clears the conversation client-side. No `claude`
    // process is spawned, no user bubble is pushed, nothing is written to the
    // transcript. Resetting `claudeSessionId` to null means the NEXT message is
    // a fresh spawn (no `--resume`), exactly like the terminal starting over.
    if (text === '/clear') {
      setMessages([]);
      setQueue([]);
      setClaudeSessionId(null);
      setSession(null);
      setAwaitingResponse(false);
      setWaitingInput(false);
      pendingUserMsgs.current.clear();
      setAttachedFiles([]);
      setInput('');
      editorRef.current?.clear();
      return;
    }

    const filePaths = attachedFiles.map((f) => f.path).join('\n');
    const fullText = filePaths ? (text ? text + '\n' + filePaths : filePaths) : text;

    setInput('');
    setAttachedFiles([]);
    editorRef.current?.clear();
    editorRef.current?.focus();

    // While a turn is awaiting a reply OR the compact-on-resume turn is in
    // flight, queue the message: it fires via `sendNextFromQueue` after the
    // running turn exits, so we never spawn a 2nd concurrent `--resume`.
    if (awaitingResponse || compacting) {
      setQueue((prev) => [...prev, { id: crypto.randomUUID(), text: fullText }]);
      return;
    }

    const msg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: fullText, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, msg]);
    setAwaitingResponse(true);
    setWaitingInput(false);

    if (session && isRunning) {
      pendingUserMsgs.current.add(fullText);
      await window.api.sendInput(session.localSessionId, fullText);
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
  }, [input, attachedFiles, awaitingResponse, compacting, session, isRunning, agentName, projectPath, claudeSessionId, editorRef, pendingUserMsgs, setInput, setAttachedFiles, setQueue, setMessages, setAwaitingResponse, setWaitingInput, setSession, setClaudeSessionId]);

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
    editorRef.current?.focus();
  }, [editorRef, setAttachedFiles]);

  const onAnswer = useCallback(async (value: string) => {
    // Don't fire a concurrent turn while the compact-on-resume turn runs; queue
    // it so it flushes after the compact turn exits (same rule as handleSend).
    if (compacting) {
      setQueue((prev) => [...prev, { id: crypto.randomUUID(), text: value }]);
      return;
    }
    const msg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: value, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, msg]);
    pendingUserMsgs.current.add(value);
    setWaitingInput(false);
    setAttachedFiles([]);
    setAwaitingResponse(true);

    if (session && isRunning) {
      await window.api.sendInput(session.localSessionId, value);
    } else {
      try {
        const data = await window.api.spawn({ agent_name: agentName, mission: value, cwd: projectPath, resume_session_id: claudeSessionId || undefined });
        setSession(data);
        if (data.claudeSessionId) setClaudeSessionId(data.claudeSessionId);
      } catch {
        setAwaitingResponse(false);
      }
    }
  }, [compacting, session, isRunning, agentName, projectPath, claudeSessionId, pendingUserMsgs, setQueue, setMessages, setWaitingInput, setAttachedFiles, setAwaitingResponse, setSession, setClaudeSessionId]);

  const handleKill = useCallback(async () => {
    if (!session) return;
    await window.api.killSession(session.localSessionId);
  }, [session]);

  return { handleSend, handleAttach, onAnswer, handleKill };
}
