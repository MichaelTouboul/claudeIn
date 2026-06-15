import { Home, MessageSquare, Sliders } from 'lucide-react';

import { Button } from '@/components/_ui/Button';
import { Inline } from '@/components/_ui/Inline';
import { Logo } from '@/components/Dashboard/Logo/Logo';
import { StatsBar } from '@/components/Dashboard/StatsBar/StatsBar';
import { cn, isMac  } from '@/lib/utils';

export type HeaderProps = {
  activeCount: number;
  connected: boolean;
  onOpenChat: () => void;
  /** Return to the Home page; omitted when the header isn't inside the Dashboard. */
  onGoHome?: () => void;
  /** Open the Customize page; omitted when the header isn't inside the Dashboard. */
  onCustomize?: () => void;
};

export function Header({ activeCount, connected, onOpenChat, onGoHome, onCustomize }: HeaderProps) {
  // `pr-16` reserves the top-right corner for the app-global Self-Improve
  // notification overlay (rendered in App.tsx, outside the Header), so the
  // floating bell never sits on top of the Chat button.
  return (
    <div className={cn('titlebar-drag flex items-center gap-4 pr-16 py-2 shrink-0', isMac ? 'pl-20' : 'pl-4')} style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
      <Inline gap={2.5}>
        <Logo size={18} />
        <span className="text-[13px] font-semibold tracking-[0.02em]" style={{ fontFamily: 'var(--font-mono)' }}>ClaudeIn</span>
      </Inline>
      {onGoHome ? (
        <Button intent="ghost" size="sm" onClick={onGoHome} className="text-fg-muted" style={{ fontFamily: 'var(--font-mono)' }}>
          <Home size={12} />
          Home
        </Button>
      ) : null}
      <div className="flex-1" />
      {onCustomize ? (
        <Button intent="outline" size="sm" onClick={onCustomize} className="text-fg-muted" style={{ fontFamily: 'var(--font-mono)' }}>
          <Sliders size={12} />
          Customize
        </Button>
      ) : null}
      <StatsBar activeCount={activeCount} connected={connected} />
      <Button intent="outline" size="sm" onClick={onOpenChat} className="glow-cyan text-accent" style={{ fontFamily: 'var(--font-mono)', border: '1px solid rgba(129, 140, 248, 0.25)' }}>
        <MessageSquare size={12} />
        Chat
      </Button>
    </div>
  );
}
