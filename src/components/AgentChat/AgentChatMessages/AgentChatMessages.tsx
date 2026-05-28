import { type RefObject } from 'react';

import { ChevronRight, Loader2, Terminal } from 'lucide-react';

import type { ChatMessage, SpawnSession } from '@/types/spawn.types';
import type { QuickReply } from '../types';
import { MessageRow } from '../MessageRow/MessageRow';

export type AgentChatMessagesProps = {
  agentName: string;
  messages: ChatMessage[];
  session: SpawnSession | null;
  isRunning: boolean;
  waitingInput: boolean;
  awaitingResponse: boolean;
  queue: string[];
  quickReplies: QuickReply[] | null;
  onQuickReply: (value: string) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
};

export function AgentChatMessages({
  agentName,
  messages,
  session,
  isRunning,
  waitingInput,
  awaitingResponse,
  queue,
  quickReplies,
  onQuickReply,
  scrollRef,
}: AgentChatMessagesProps) {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 font-mono">
      {messages.length === 0 && !session ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <Terminal size={32} className="text-gray-800 mx-auto mb-2" />
            <p className="text-gray-600 text-xs">Type a prompt to start a session with <span className="text-cyan-500">{agentName}</span></p>
            <p className="text-gray-700 text-xs mt-1">Type <span className="text-yellow-500">/</span> for commands</p>
          </div>
        </div>
      ) : null}
      {messages.length === 0 && session ? (
        <div className="h-full flex items-center justify-center">
          <Loader2 size={20} className="text-cyan-400 animate-spin" />
        </div>
      ) : null}
      {messages.map((msg, i) => (
        <MessageRow
          key={i}
          msg={msg}
          isLast={i === messages.length - 1 || (msg.role === "assistant" && i === messages.length - 1)}
          quickReplies={i === messages.length - 1 && msg.role === "assistant" ? quickReplies : null}
          onQuickReply={onQuickReply}
        />
      ))}
      {isRunning && awaitingResponse && !waitingInput ? (
        <div className="flex items-center gap-2 text-gray-600 text-xs ml-5">
          <Loader2 size={10} className="animate-spin" />
          thinking...
        </div>
      ) : null}
      {queue.length > 0 ? (
        <div className="space-y-1 ml-5 mt-1">
          {queue.map((q, i) => (
            <div key={i} className="flex items-center gap-2 opacity-40">
              <ChevronRight size={10} className="text-cyan-400" />
              <span className="text-xs text-cyan-300 font-mono">{q}</span>
              <span className="text-[10px] text-gray-600 italic">queued</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
