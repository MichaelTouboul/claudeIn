import { useEffect, useRef, useState } from 'react';

import type { SpawnSession } from '@/lib/types';

// Status of the one-shot compact-on-resume turn (the automatic `/compact` run
// fired on mount). Drives a small inline banner; never locks the input.
export type CompactStatus = null | 'compacting' | 'done' | 'failed';

// The compact-relevant slice of the spawn push events AgentChat already routes.
// `localSessionId` is optional so AgentChat can forward any event verbatim;
// `status` rides on every member (only read for `spawn_exit`) so the discriminant
// narrows cleanly without an overlapping catch-all member.
type CompactEvent = {
  type: string;
  localSessionId?: string;
  status?: SpawnSession['status'];
};

type UseCompactOnResumeParams = {
  compactOnResume?: boolean;
  resumeSessionId?: string;
  projectPath: string | undefined;
  agentName: string;
  setSession: (s: SpawnSession) => void;
  setClaudeSessionId: (id: string) => void;
  // Flush one queued message (the chat's sendNextFromQueue). Called once the
  // compact turn settles so a message typed during compaction fires next.
  flushQueue: () => void;
};

/**
 * Compact-on-resume: on mount, fire ONE automatic in-session `/compact` turn on
 * the resumed session before the user continues. Deliberately distinct from the
 * normal turn path — it does NOT add a "/compact" user message, does NOT touch
 * `pendingUserMsgs`, and does NOT set `awaitingResponse`, so the input stays
 * free throughout. Surfaced as a status banner; `compacting` is true while the
 * turn is in flight so the chat routes a message typed during it into the queue
 * (never a 2nd concurrent `--resume`). Returns `onCompactEvent`, which the
 * chat's single onEvent handler calls so this turn's `spawn_compacted` /
 * `spawn_exit` flip the banner and release `compacting` without colliding with
 * later real turns. The compact turn usually emits no assistant text — the
 * `spawn_compacted` system event (or, as a fallback, its `spawn_exit`) is the
 * signal.
 */
export function useCompactOnResume({
  compactOnResume,
  resumeSessionId,
  projectPath,
  agentName,
  setSession,
  setClaudeSessionId,
  flushQueue,
}: UseCompactOnResumeParams) {
  const [compactStatus, setCompactStatus] = useState<CompactStatus>(null);
  const [compacting, setCompacting] = useState(false);

  const sentRef = useRef(false);
  const localSessionIdRef = useRef<string | null>(null);
  // Whether this turn's `spawn_compacted` boundary arrived. Lets the compact
  // turn's `spawn_exit` act as a fallback: exit-done WITHOUT a boundary means
  // compaction didn't happen → show the non-blocking "unavailable" notice.
  const boundarySeenRef = useRef(false);
  const flushRef = useRef(flushQueue);
  flushRef.current = flushQueue;

  useEffect(() => {
    if (sentRef.current) return;
    if (!compactOnResume || !resumeSessionId || !projectPath) return;
    sentRef.current = true;
    setClaudeSessionId(resumeSessionId);
    setCompactStatus('compacting');
    setCompacting(true);
    window.api.spawn({ agent_name: agentName || undefined, mission: '/compact', cwd: projectPath, resume_session_id: resumeSessionId })
      .then((data: SpawnSession) => {
        localSessionIdRef.current = data.localSessionId;
        setSession(data);
        setClaudeSessionId(data.claudeSessionId ?? resumeSessionId);
      })
      .catch(() => {
        setCompactStatus('failed');
        setCompacting(false);
      });
  }, [compactOnResume, resumeSessionId, projectPath, agentName, setSession, setClaudeSessionId]);

  // Called from AgentChat's onEvent for every spawn event. No-ops unless the
  // event belongs to this compact turn's process.
  const onCompactEvent = (data: CompactEvent) => {
    const id = localSessionIdRef.current;
    if (!id) return;
    if (data.type === 'spawn_compacted' && data.localSessionId === id) {
      boundarySeenRef.current = true;
      setCompactStatus('done');
      setCompacting(false);
      setTimeout(() => flushRef.current(), 100);
      return;
    }
    if (data.type === 'spawn_exit' && data.localSessionId === id) {
      if (!boundarySeenRef.current) {
        setCompactStatus(data.status === 'done' ? 'done' : 'failed');
      }
      setCompacting(false);
      setTimeout(() => flushRef.current(), 100);
    }
  };

  return { compactStatus, compacting, onCompactEvent };
}
