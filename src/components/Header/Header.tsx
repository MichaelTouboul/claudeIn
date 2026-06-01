import { Bot, MessageSquare } from 'lucide-react';

import { Button } from '@/components/_ui/Button';
import { ProjectSwitcher } from '@/components/ProjectSwitcher/ProjectSwitcher';
import { StatsBar, type StatsBarProps } from '@/components/StatsBar/StatsBar';
import type { Project } from '@/types/dashboard.types';

export type HeaderProps = {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (p: Project) => void;
  stats: StatsBarProps['stats'];
  activeCount: number;
  connected: boolean;
  onOpenChat: () => void;
};

export function Header({ projects, selectedProject, onSelectProject, stats, activeCount, connected, onOpenChat }: HeaderProps) {
  return (
    <div className="titlebar-drag flex items-center gap-4 pl-20 pr-4 py-2 shrink-0" style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2.5">
        <Bot size={16} className="text-accent" />
        <span className="text-[13px] font-semibold tracking-[0.02em]" style={{ fontFamily: 'var(--font-mono)' }}>Agent Manager</span>
      </div>
      <ProjectSwitcher projects={projects} selected={selectedProject} onSelect={onSelectProject} />
      <div className="flex-1" />
      <StatsBar stats={stats} activeCount={activeCount} connected={connected} />
      <Button intent="outline" size="sm" onClick={onOpenChat} className="glow-cyan text-accent" style={{ fontFamily: 'var(--font-mono)', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
        <MessageSquare size={12} />
        Chat
      </Button>
    </div>
  );
}
