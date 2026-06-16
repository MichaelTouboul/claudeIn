import { Home, MessageSquare, Sliders } from 'lucide-react';

import { Button } from '@/components/_ui/Button';
import { Inline } from '@/components/_ui/Inline';
import { BrandName } from '@/components/BrandName/BrandName';
import { StatsBar } from '@/components/Dashboard/StatsBar/StatsBar';
import { Logo } from '@/components/Logo/Logo';
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
    <div
      className={cn('titlebar-drag flex h-[var(--header-height)] items-center gap-3 pr-16 shrink-0', isMac ? 'pl-20' : 'pl-4')}
      style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}
    >
      <Inline gap={2}>
        <Logo size={22} />
        <BrandName className="text-md font-semibold tracking-[-0.01em] text-fg" />
      </Inline>
      {onGoHome ? (
        <Button intent="ghost" size="sm" onClick={onGoHome} leftIcon={<Home size={15} aria-hidden="true" />}>
          Home
        </Button>
      ) : null}
      <div className="flex-1" />
      {onCustomize ? (
        <Button intent="outline" size="sm" onClick={onCustomize} leftIcon={<Sliders size={15} aria-hidden="true" />}>
          Customize
        </Button>
      ) : null}
      <StatsBar activeCount={activeCount} connected={connected} />
      <Button intent="secondary" size="sm" onClick={onOpenChat} leftIcon={<MessageSquare size={15} aria-hidden="true" />}>
        Chat
      </Button>
    </div>
  );
}
