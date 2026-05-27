import { Bot, ChevronRight, Wrench, ArrowUp, ArrowDown } from "lucide-react";
import { useRef, useEffect } from "react";
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

  useEffect(() => {
    if (scrollRef.current && conversation) {
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50);
    }
  }, [conversation?.sessionId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Loading conversation...
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
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
      <div
        className="px-6 py-3 border-b flex items-center gap-3"
        style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border)' }}
      >
        <Bot size={14} style={{ color: '#a855f7' }} />
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
        >
          {conversation.sessionId.slice(0, 8)}
        </span>
        {conversation.model && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{
              background: 'rgba(168,85,247,0.12)',
              color: '#c4b5fd',
              border: '1px solid rgba(168,85,247,0.15)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {conversation.model}
          </span>
        )}
        <span
          className="text-[10px] ml-auto"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
        >
          {formatTokens(conversation.totalTokensIn)} in · {formatTokens(conversation.totalTokensOut)} out · {conversation.messages.length} msgs
        </span>
        <div className="flex items-center gap-0.5 ml-2">
          <button
            onClick={() => scrollTo("top")}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)', e.currentTarget.style.background = 'var(--color-surface-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)', e.currentTarget.style.background = 'transparent')}
          >
            <ArrowUp size={12} />
          </button>
          <button
            onClick={() => scrollTo("bottom")}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)', e.currentTarget.style.background = 'var(--color-surface-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)', e.currentTarget.style.background = 'transparent')}
          >
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
                  <ChevronRight size={12} style={{ color: 'var(--color-accent)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>you</span>
                </div>
                <pre
                  className="text-sm whitespace-pre-wrap ml-5 leading-relaxed"
                  style={{ color: '#67e8f9' }}
                >
                  {msg.content}
                </pre>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Bot size={12} style={{ color: 'var(--color-text-secondary)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>assistant</span>
                  {msg.tokensIn != null && msg.tokensIn > 0 && (
                    <span
                      className="text-[10px] ml-auto"
                      style={{ color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatTokens(msg.tokensIn)}↓ {formatTokens(msg.tokensOut || 0)}↑
                    </span>
                  )}
                </div>
                {msg.toolNames && msg.toolNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 ml-5 mb-1">
                    {msg.toolNames.map((t, j) => (
                      <span
                        key={j}
                        className="flex items-center gap-1 text-[10px]"
                        style={{ color: 'rgba(250,204,21,0.5)' }}
                      >
                        <Wrench size={9} />{t}
                      </span>
                    ))}
                  </div>
                )}
                <pre
                  className="text-sm whitespace-pre-wrap ml-5 leading-relaxed"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {msg.content}
                </pre>
              </div>
            )}
          </div>
        ))}
        {conversation.messages.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>No messages in this session</p>
        )}
      </div>
    </div>
  );
}
