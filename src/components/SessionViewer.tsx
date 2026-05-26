import { Bot, ChevronRight, Wrench, ArrowUp, ArrowDown } from "lucide-react";
import { useRef } from "react";
import type { SessionConversation } from "../hooks/useSessions";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function SessionViewer({
  conversation,
  loading,
}: {
  conversation: SessionConversation | null;
  loading: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        Loading conversation...
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center text-gray-700 text-sm">
        Select a session to view
      </div>
    );
  }

  const scrollTo = (pos: "top" | "bottom") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = pos === "top" ? 0 : scrollRef.current.scrollHeight;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-3 border-b border-gray-800/80 flex items-center gap-3">
        <Bot size={14} className="text-purple-400" />
        <span className="text-sm font-medium text-white">
          {conversation.sessionId.slice(0, 8)}
        </span>
        {conversation.model && (
          <span className="text-[10px] bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded">
            {conversation.model}
          </span>
        )}
        <span className="text-[10px] text-gray-500 font-mono tabular-nums ml-auto">
          {formatTokens(conversation.totalTokensIn)} in · {formatTokens(conversation.totalTokensOut)} out · {conversation.messages.length} msgs
        </span>
        <div className="flex items-center gap-0.5 ml-2">
          <button onClick={() => scrollTo("top")} className="p-1 text-gray-600 hover:text-gray-300 transition-colors">
            <ArrowUp size={12} />
          </button>
          <button onClick={() => scrollTo("bottom")} className="p-1 text-gray-600 hover:text-gray-300 transition-colors">
            <ArrowDown size={12} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 font-mono">
        {conversation.messages.map((msg, i) => (
          <div key={i} className="group">
            {msg.role === "user" ? (
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <ChevronRight size={12} className="text-cyan-400" />
                  <span className="text-xs text-cyan-400 font-medium">you</span>
                </div>
                <pre className="text-sm text-cyan-300 whitespace-pre-wrap ml-5 leading-relaxed">{msg.content}</pre>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Bot size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-400 font-medium">assistant</span>
                  {msg.tokensIn != null && msg.tokensIn > 0 && (
                    <span className="text-[10px] text-gray-600 ml-auto tabular-nums">
                      {formatTokens(msg.tokensIn)}↓ {formatTokens(msg.tokensOut || 0)}↑
                    </span>
                  )}
                </div>
                {msg.toolNames && msg.toolNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 ml-5 mb-1">
                    {msg.toolNames.map((t, j) => (
                      <span key={j} className="flex items-center gap-1 text-[10px] text-yellow-500/60">
                        <Wrench size={9} />{t}
                      </span>
                    ))}
                  </div>
                )}
                <pre className="text-sm text-gray-200 whitespace-pre-wrap ml-5 leading-relaxed">{msg.content}</pre>
              </div>
            )}
          </div>
        ))}
        {conversation.messages.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-8">No messages in this session</p>
        )}
      </div>
    </div>
  );
}
