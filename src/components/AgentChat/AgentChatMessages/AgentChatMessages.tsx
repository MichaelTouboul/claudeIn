import { ChevronRight, Loader2, Terminal } from 'lucide-react';
import { type RefObject } from 'react';

import type { ChatMessage, SpawnSession } from '@/types/spawn.types';

import { MessageRow } from '../MessageRow/MessageRow';
import type { QueueItem } from '../types';

export type AgentChatMessagesProps = {
  agentName: string;
  messages: ChatMessage[];
  session: SpawnSession | null;
  isRunning: boolean;
  waitingInput: boolean;
  awaitingResponse: boolean;
  queue: QueueItem[];
  onAnswer: (value: string) => void;
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
  onAnswer,
  scrollRef,
}: AgentChatMessagesProps) {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 font-mono">
      {messages.length === 0 && !session ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <Terminal size={32} className="text-fg-subtle mx-auto mb-2" />
            <p className="text-fg-subtle text-xs">Type a prompt to start a session with <span className="text-accent">{agentName}</span></p>
            <p className="text-fg-subtle text-xs mt-1">Type <span className="text-yellow-500">/</span> for commands</p>
          </div>
        </div>
      ) : null}
      {messages.length === 0 && session ? (
        <div className="h-full flex items-center justify-center">
          <Loader2 size={20} className="text-accent animate-spin" />
        </div>
      ) : null}
      {messages.map((msg, i) => (
        <MessageRow
          key={msg.id}
          msg={msg}
          isLast={i === messages.length - 1}
          onAnswer={onAnswer}
        />
      ))}
      {isRunning && awaitingResponse && !waitingInput ? (
        <div className="flex items-center gap-2 text-fg-subtle text-xs ml-5">
          <Loader2 size={10} className="animate-spin" />
          thinking...
        </div>
      ) : null}
      {queue.length > 0 ? (
        <div className="space-y-1 ml-5 mt-1">
          {queue.map((q) => (
            <div key={q.id} className="flex items-center gap-2 opacity-40">
              <ChevronRight size={10} className="text-accent" />
              <span className="text-xs text-accent font-mono">{q.text}</span>
              <span className="text-[10px] text-fg-subtle italic">queued</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
