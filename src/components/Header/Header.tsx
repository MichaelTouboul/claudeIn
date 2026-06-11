import { Home, MessageSquare } from 'lucide-react';

import { Button } from '@/components/_ui/Button';
import { Logo } from '@/components/Logo/Logo';
import { StatsBar } from '@/components/StatsBar/StatsBar';
import { cn } from '@/lib/cn';
import { isMac } from '@/lib/platform';

export type HeaderProps = {
  activeCount: number;
  connected: boolean;
  onOpenChat: () => void;
  /** Return to the Home page; omitted when the header isn't inside the Dashboard. */
  onGoHome?: () => void;
};

export function Header({ activeCount, connected, onOpenChat, onGoHome }: HeaderProps) {
  return (
    <div className={cn('titlebar-drag flex items-center gap-4 pr-4 py-2 shrink-0', isMac ? 'pl-20' : 'pl-4')} style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2.5">
        <Logo size={18} />
        <span className="text-[13px] font-semibold tracking-[0.02em]" style={{ fontFamily: 'var(--font-mono)' }}>ClaudeIn</span>
      </div>
      {onGoHome ? (
        <Button intent="ghost" size="sm" onClick={onGoHome} className="text-fg-muted" style={{ fontFamily: 'var(--font-mono)' }}>
          <Home size={12} />
          Accueil
        </Button>
      ) : null}
      <div className="flex-1" />
      <StatsBar activeCount={activeCount} connected={connected} />
      <Button intent="outline" size="sm" onClick={onOpenChat} className="glow-cyan text-accent" style={{ fontFamily: 'var(--font-mono)', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
        <MessageSquare size={12} />
        Chat
      </Button>
    </div>
  );
}
