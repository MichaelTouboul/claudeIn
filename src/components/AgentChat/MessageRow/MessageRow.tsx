import { Bot, ChevronRight, Shield, Wrench } from 'lucide-react';

import { renderContentWithImages } from '@/components/_ui/InlineImage';
import { ResponseBody } from '@/components/ResponseBody/ResponseBody';
import type { ChatMessage } from '@/types/spawn.types';

import { PERMISSION_PATTERNS, replyStyles } from '../quickReplies';
import type { QuickReply } from '../types';

export type MessageRowProps = {
  msg: ChatMessage;
  isLast: boolean;
  quickReplies: QuickReply[] | null;
  onQuickReply: (value: string) => void;
};

export function MessageRow({ msg, isLast, quickReplies, onQuickReply }: MessageRowProps) {
  const isUser = msg.role === "user";
  const isTool = msg.role === "tool";
  const time = new Date(msg.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  if (isUser) {
    return (
      <div className="group">
        <div className="flex items-center gap-2 mb-0.5">
          <ChevronRight size={12} className="text-accent" />
          <span className="text-xs text-accent font-medium">you</span>
          <span className="text-xs text-fg-subtle opacity-0 group-hover:opacity-100">{time}</span>
        </div>
        <pre className="text-sm text-accent whitespace-pre-wrap font-mono ml-5 leading-relaxed">{renderContentWithImages(msg.content)}</pre>
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

  const hasPermission = isLast && quickReplies && PERMISSION_PATTERNS.some((p) => p.test(msg.content));

  return (
    <div className="group">
      <div className="flex items-center gap-2 mb-0.5">
        {hasPermission ? (
          <Shield size={12} className="text-yellow-400" />
        ) : (
          <Bot size={12} className="text-fg-muted" />
        )}
        <span className={`text-xs font-medium ${hasPermission ? "text-yellow-400" : "text-fg-muted"}`}>
          {hasPermission ? "authorization" : "agent"}
        </span>
        <span className="text-xs text-fg-subtle opacity-0 group-hover:opacity-100">{time}</span>
      </div>
      <div className="ml-5">
        <ResponseBody content={msg.content} />
      </div>
      {isLast && quickReplies ? <div className="flex flex-wrap gap-2 ml-5 mt-2">
          {quickReplies.map((r) => (
            <button
              key={r.value}
              onClick={() => onQuickReply(r.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${replyStyles[r.variant]}`}
            >
              {r.label}
            </button>
          ))}
        </div> : null}
    </div>
  );
}
