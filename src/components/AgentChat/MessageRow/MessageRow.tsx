import { Bot, ChevronRight, Shield, Wrench } from 'lucide-react';

import { renderContentWithImages } from '@/components/_ui/InlineImage';
import { ResponseBody } from '@/components/ResponseBody/ResponseBody';
import type { ChatMessage } from '@/types/spawn.types';

import { parseAskPrompt } from '../askPrompt';
import { AskPrompt } from '../AskPrompt/AskPrompt';
import { parseSlashCommand } from '../slashCommand';
import { SlashCommandMessage } from './SlashCommandMessage/SlashCommandMessage';

export type MessageRowProps = {
  msg: ChatMessage;
  isLast: boolean;
  onAnswer: (value: string) => void;
};

export function MessageRow({ msg, isLast, onAnswer }: MessageRowProps) {
  const isUser = msg.role === "user";
  const isTool = msg.role === "tool";
  const time = new Date(msg.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  if (isUser) {
    const slash = parseSlashCommand(msg.content);
    // Caveat-only plumbing: the whole row disappears (no empty "you" header).
    if (slash?.kind === 'caveat') return null;
    return (
      <div className="group">
        <div className="flex items-center gap-2 mb-0.5">
          <ChevronRight size={12} className="text-accent" />
          <span className="text-xs text-accent font-medium">you</span>
          <span className="text-xs text-fg-subtle opacity-0 group-hover:opacity-100">{time}</span>
        </div>
        {slash ? (
          <SlashCommandMessage parsed={slash} />
        ) : (
          <pre className="text-sm text-accent whitespace-pre-wrap font-mono ml-5 leading-relaxed">{renderContentWithImages(msg.content)}</pre>
        )}
      </div>
    );
  }

  if (isTool) {
    return (
      <div className="group ml-5">
        <div className="flex items-center gap-2 mb-0.5">
          <Wrench size={10} className="text-yellow-500" />
          <span className="text-xs text-yellow-500 font-mono">{msg.toolName || "tool"}</span>
          <span className="text-xs text-fg-subtle opacity-0 group-hover:opacity-100">{time}</span>
        </div>
        <pre className="text-xs text-fg-muted whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">{renderContentWithImages(msg.content)}</pre>
      </div>
    );
  }

  const prompt = parseAskPrompt(msg.content);
  const isAuthorization =
    prompt?.type === 'choice' &&
    prompt.options.some((o) => o.variant === 'accept' || o.variant === 'deny');

  return (
    <div className="group">
      <div className="flex items-center gap-2 mb-0.5">
        {isAuthorization ? (
          <Shield size={12} className="text-yellow-400" />
        ) : (
          <Bot size={12} className="text-fg-muted" />
        )}
        <span className={`text-xs font-medium ${isAuthorization ? "text-yellow-400" : "text-fg-muted"}`}>
          {isAuthorization ? "authorization" : "agent"}
        </span>
        <span className="text-xs text-fg-subtle opacity-0 group-hover:opacity-100">{time}</span>
      </div>
      <div className="ml-5">
        <ResponseBody content={msg.content} />
      </div>
      {prompt ? <AskPrompt prompt={prompt} isActive={isLast} onAnswer={onAnswer} /> : null}
    </div>
  );
}
