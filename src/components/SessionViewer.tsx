import { Bot, ChevronRight, Wrench, ArrowUp, ArrowDown, ChevronsDown, Send } from "lucide-react";
import { useRef, useEffect, useState, useCallback } from "react";
import type { SessionConversation } from "../hooks/useSessions";
import { renderContentWithImages } from "./InlineImage";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function SessionViewer({
  conversation,
  loading,
  onResume,
}: {
  conversation: SessionConversation | null;
  loading: boolean;
  onResume?: (sessionId: string, message: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [resumeInput, setResumeInput] = useState("");
  const resumeInputRef = useRef<HTMLTextAreaElement>(null);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // Show button when scrolled more than 200px from bottom
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
  }, []);

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

      <div className="relative flex-1 min-h-0">
        <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto px-6 py-4 space-y-4 font-mono">
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
                    {renderContentWithImages(msg.content)}
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
                    {renderContentWithImages(msg.content)}
                  </pre>
                </div>
              )}
            </div>
          ))}
          {conversation.messages.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>No messages in this session</p>
          )}
        </div>

        {/* Floating scroll-to-bottom button */}
        {showScrollBtn && (
          <button
            onClick={() => {
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
            }}
            className="absolute bottom-4 right-4 p-2 rounded-full shadow-lg transition-all hover:scale-110"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
            title="Scroll to bottom"
          >
            <ChevronsDown size={16} />
          </button>
        )}
      </div>

      {/* Resume input */}
      {onResume && conversation && (
        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
        >
          <div className="flex gap-2 items-end">
            <div className="flex items-center text-sm shrink-0 pt-1.5" style={{ color: 'var(--color-accent)' }}>
              <ChevronRight size={14} />
            </div>
            <textarea
              ref={resumeInputRef}
              value={resumeInput}
              onChange={(e) => setResumeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (resumeInput.trim()) {
                    onResume(conversation.sessionId, resumeInput.trim());
                    setResumeInput("");
                  }
                }
              }}
              placeholder="Continue this session..."
              rows={1}
              className="flex-1 bg-transparent text-sm resize-none focus:outline-none placeholder-gray-700 leading-relaxed"
              style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
            />
            <button
              onClick={() => {
                if (resumeInput.trim()) {
                  onResume(conversation.sessionId, resumeInput.trim());
                  setResumeInput("");
                }
              }}
              disabled={!resumeInput.trim()}
              className="p-1.5 transition-colors shrink-0"
              style={{ color: resumeInput.trim() ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
