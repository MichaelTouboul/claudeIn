import type { OpenChat } from '../types';

export type ConversationStatus = 'live' | 'waiting' | 'idle';
export type AnnotatedConversation = OpenChat & { status: ConversationStatus };

/** Annotate each open chat with a runtime status. waiting > live > idle. */
export function annotateConversations(
  openChats: OpenChat[],
  activeAgents: Set<string>,
  waitingAgents: Set<string>
): AnnotatedConversation[] {
  return openChats.map((chat) => {
    const status: ConversationStatus = waitingAgents.has(chat.agentName)
      ? 'waiting'
      : activeAgents.has(chat.agentName)
        ? 'live'
        : 'idle';
    return { ...chat, status };
  });
}
