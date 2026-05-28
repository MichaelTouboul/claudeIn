import { useState } from "react";
import { X, Minus, MessageSquare } from "lucide-react";
import { AgentChat } from '@/components/AgentChat/AgentChat';

export type GlobalChatModalProps = {
  onClose: () => void;
};

export function GlobalChatModal({
  onClose,
}: GlobalChatModalProps) {
  const [minimized, setMinimized] = useState(false);
  const [title, setTitle] = useState("Claude Code");
  const [editingTitle, setEditingTitle] = useState(false);

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 group"
        style={{
          background: 'var(--color-surface-3)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(6,182,212,0.2)';
          e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4), 0 0 12px rgba(6,182,212,0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4)';
        }}
      >
        <MessageSquare size={14} style={{ color: 'var(--color-accent)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{title}</span>
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgba(6,182,212,0.5)' }} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />
      <div
        className="relative w-[720px] h-[82vh] rounded-2xl flex flex-col"
        style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.6), 0 0 1px rgba(6,182,212,0.1)',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b rounded-t-2xl"
          style={{ background: 'var(--color-surface-3)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <MessageSquare size={15} style={{ color: 'var(--color-accent)' }} />
            {editingTitle ? (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
                className="rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 w-48"
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid rgba(6,182,212,0.3)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-mono)',
                }}
                autoFocus
              />
            ) : (
              <span
                onDoubleClick={() => setEditingTitle(true)}
                className="text-sm font-bold cursor-text transition-colors"
                style={{ color: 'var(--color-text-primary)' }}
                title="Double-click to rename"
              >
                {title}
              </span>
            )}
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase"
              style={{
                color: 'var(--color-text-muted)',
                background: 'var(--color-surface-2)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.08em',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              global
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setMinimized(true)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; e.currentTarget.style.background = 'var(--color-surface-2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
              title="Minimize"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; e.currentTarget.style.background = 'var(--color-surface-2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 p-3">
          <AgentChat agentName="_main" />
        </div>
      </div>
    </div>
  );
}
