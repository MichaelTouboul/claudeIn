import type { ChatMessage, SpawnSession } from '@/lib/types';

/** A user message pending in the send queue. The `id` is stable across re-renders so React
 *  diffs work correctly when items are added/removed.
 */
export type QueueItem = {
  id: string;
  text: string;
};

/** A live-process broadcast routed to AgentChat. The backend doesn't generate
 *  ChatMessage.id — it's minted on receive. */
export type SpawnEvent =
  | { type: 'spawn_message'; localSessionId: string; message: Omit<ChatMessage, 'id'> }
  | { type: 'spawn_input_request'; localSessionId: string }
  | { type: 'spawn_claude_session'; localSessionId: string; claudeSessionId: string }
  | { type: 'spawn_compacted'; localSessionId: string }
  | { type: 'spawn_exit'; localSessionId: string; status: SpawnSession['status']; claudeSessionId?: string };
