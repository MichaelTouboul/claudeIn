import { Bot, ChevronDown, FolderOpen, Settings,Wrench } from "lucide-react";

import { Popover, PopoverClose } from '@/components/_ui/Popover';

import type { Project } from "../../hooks/useProjects";

export type ProjectSwitcherProps = {
  projects: Project[];
  selected: Project | null;
  onSelect: (p: Project) => void;
};

export function ProjectSwitcher({
  projects,
  selected,
  onSelect,
}: ProjectSwitcherProps) {
  const trigger = (
    <button
      className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-150"
      style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        fontFamily: 'var(--font-mono)',
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(6,182,212,0.25)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
    >
      <FolderOpen size={13} style={{ color: 'var(--color-accent)' }} />
      <span
        className="text-[13px] font-medium max-w-[200px] truncate"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {selected?.name || "Select project"}
      </span>
      <ChevronDown size={11} style={{ color: 'var(--color-text-muted)' }} />
    </button>
  );

  return (
    <Popover trigger={trigger} align="start" className="w-80">
      <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
        <span
          className="text-[10px] font-semibold uppercase"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
        >
          Projects
        </span>
      </div>
      <div className="max-h-80 overflow-y-auto p-1">
        {projects.map((p) => {
          const isSelected = selected?.id === p.id;
          return (
            <PopoverClose asChild key={p.id}>
              <button
                onClick={() => onSelect(p)}
                className="w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-3 transition-all duration-150"
                style={{
                  background: isSelected ? 'var(--color-accent-dim)' : 'transparent',
                  border: isSelected ? '1px solid rgba(6,182,212,0.15)' : '1px solid transparent',
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--color-surface-3)'; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <FolderOpen
                  size={13}
                  className="mt-0.5 shrink-0"
                  style={{ color: p.id === "user" ? '#facc15' : 'var(--color-accent)' }}
                />
                <div className="min-w-0 flex-1">
                  <div
                    className="text-[13px] font-medium truncate"
                    style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)' }}
                  >
                    {p.name}
                  </div>
                  <div
                    className="text-[11px] truncate"
                    style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                  >
                    {p.path}
                  </div>
                  <div className="flex gap-3 mt-1">
                    {p.agentCount > 0 ? <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        <Bot size={10} /> {p.agentCount}
                      </span> : null}
                    {p.skillCount > 0 ? <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        <Wrench size={10} /> {p.skillCount}
                      </span> : null}
                    {p.hasSettings ? <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                        <Settings size={10} />
                      </span> : null}
                  </div>
                </div>
              </button>
            </PopoverClose>
          );
        })}
      </div>
    </Popover>
  );
}
