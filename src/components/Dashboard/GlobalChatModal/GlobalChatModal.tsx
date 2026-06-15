import { MessageSquare,Minus, X } from "lucide-react";
import { type MouseEvent, useState } from "react";

import { Button } from '@/components/_ui/Button';
import { Dialog } from '@/components/_ui/Dialog';
import { Flex } from '@/components/_ui/Flex';
import { Inline } from '@/components/_ui/Inline';
import { Input } from '@/components/_ui/Input';
import { StatusDot } from '@/components/_ui/StatusDot';
import { AgentChat } from '@/components/Dashboard/AgentChat/AgentChat';

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
      <Inline
        as="button"
        gap={2}
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-xl transition-all duration-200 group"
        style={{
          background: 'var(--color-surface-3)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
        onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.borderColor = 'rgba(129, 140, 248,0.2)';
          e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4), 0 0 12px rgba(129, 140, 248,0.08)';
        }}
        onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4)';
        }}
      >
        <MessageSquare size={14} style={{ color: 'var(--color-accent)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{title}</span>
        <StatusDot size="xs" pulse style={{ background: 'rgba(129, 140, 248,0.5)' }} />
      </Inline>
    );
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }} variant="center" title="Claude Code chat">
      <div
        className="relative w-[720px] h-[82vh] rounded-2xl flex flex-col"
        style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.6), 0 0 1px rgba(129, 140, 248,0.1)',
        }}
      >
        <Flex
          align="center"
          justify="between"
          className="px-5 py-3.5 border-b rounded-t-2xl"
          style={{ background: 'var(--color-surface-3)', borderColor: 'var(--color-border)' }}
        >
          <Inline gap={2.5}>
            <MessageSquare size={15} style={{ color: 'var(--color-accent)' }} />
            {editingTitle ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
                size="sm"
                font="mono"
                className="w-48"
                autoFocus
              />
            ) : (
              <span
                role="button"
                tabIndex={0}
                onDoubleClick={() => setEditingTitle(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'F2') {
                    e.preventDefault();
                    setEditingTitle(true);
                  }
                }}
                className="text-sm font-bold cursor-text transition-colors focus:outline-none focus:ring-1 focus:ring-accent rounded"
                style={{ color: 'var(--color-text-primary)' }}
                title="Double-click or press Enter to rename"
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
          </Inline>
          <Inline gap={0.5}>
            <Button intent="ghost" size="icon" onClick={() => setMinimized(true)} title="Minimize">
              <Minus size={14} />
            </Button>
            <Button intent="ghost" size="icon" onClick={onClose} title="Close" aria-label="Close chat">
              <X size={14} />
            </Button>
          </Inline>
        </Flex>

        <div className="flex-1 min-h-0 p-3">
          <AgentChat agentName="_main" />
        </div>
      </div>
    </Dialog>
  );
}
