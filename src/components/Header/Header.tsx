import { MessageSquare } from 'lucide-react';

import { Button } from '@/components/_ui/Button';
import { ActivityMeter } from '@/components/Header/ActivityMeter/ActivityMeter';
import { Logo } from '@/components/Logo/Logo';
import { StatsBar, type StatsBarProps } from '@/components/StatsBar/StatsBar';
import { cn } from '@/lib/cn';
import { isMac } from '@/lib/platform';

export type HeaderProps = {
  stats: StatsBarProps['stats'];
  activeCount: number;
  connected: boolean;
  refreshSignal: number;
  onOpenChat: () => void;
};

export function Header({ stats, activeCount, connected, refreshSignal, onOpenChat }: HeaderProps) {
  return (
    <div className={cn('titlebar-drag flex items-center gap-4 pr-4 py-2 shrink-0', isMac ? 'pl-20' : 'pl-4')} style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2.5">
        <Logo size={18} />
        <span className="text-[13px] font-semibold tracking-[0.02em]" style={{ fontFamily: 'var(--font-mono)' }}>ClaudeIn</span>
      </div>
      <div className="flex-1" />
      <StatsBar stats={stats} activeCount={activeCount} connected={connected} />
      <ActivityMeter refreshSignal={refreshSignal} />
      <Button intent="outline" size="sm" onClick={onOpenChat} className="glow-cyan text-accent" style={{ fontFamily: 'var(--font-mono)', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
        <MessageSquare size={12} />
        Chat
      </Button>
    </div>
  );
}
