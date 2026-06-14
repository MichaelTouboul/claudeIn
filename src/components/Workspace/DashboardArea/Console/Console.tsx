import { Activity, ChevronDown, ChevronUp, Terminal as TerminalIcon } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

import { Button } from '@/components/_ui/Button';
import { EventConsole } from '@/components/EventConsole/EventConsole';
import { useConsoleStore } from '@/store/dashboard/useConsoleStore';
import { useDashboardStore } from '@/store/dashboard/useDashboardStore';
import { useEventsStore } from '@/store/dashboard/useEventsStore';
import { useAppStore } from '@/store/useAppStore';

import { ConsoleResizeHandle } from './ConsoleResizeHandle/ConsoleResizeHandle';
import { TerminalView } from './TerminalView/TerminalView';

type Tab = 'terminal' | 'events';

const BAR_HEIGHT = 36;
const HANDLE_HEIGHT = 5;

export function Console() {
  const events = useEventsStore((s) => s.events);
  const agents = useDashboardStore((s) => s.agents);
  const projectPath = useAppStore((s) => s.selectedProject?.path ?? null);

  const open = useConsoleStore((s) => s.open);
  const height = useConsoleStore((s) => s.height);
  const setOpen = useConsoleStore((s) => s.setOpen);
  const toggle = useConsoleStore((s) => s.toggle);

  const agentColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of agents) {
      map.set(a.id, a.frontmatter.color || 'cyan');
    }
    return map;
  }, [agents]);

  const [tab, setTab] = useState<Tab>('terminal');

  const tabBtn = (id: Tab, label: string, icon: ReactNode) => (
    <button
      onClick={() => {
        setTab(id);
        setOpen(true);
      }}
      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium"
      style={{
        color: tab === id ? 'var(--color-accent)' : 'var(--color-text-muted)',
        borderBottom: tab === id ? '2px solid var(--color-accent)' : '2px solid transparent',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      style={{
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-surface-0)',
        height: open ? `${height}px` : `${BAR_HEIGHT}px`,
      }}
    >
      {open ? <ConsoleResizeHandle /> : null}
      <div className="flex items-center" style={{ background: 'var(--color-surface-1)' }}>
        {tabBtn('terminal', 'Terminal', <TerminalIcon size={12} />)}
        {tabBtn('events', `Events (${events.length})`, <Activity size={12} />)}
        <Button
          intent="ghost"
          size="icon"
          onClick={() => toggle()}
          className="ml-auto h-auto w-auto px-3 py-2"
          title={open ? 'Close' : 'Open'}
        >
          {open ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </Button>
      </div>
      {open ? (
        <div style={{ height: `calc(100% - ${BAR_HEIGHT + HANDLE_HEIGHT}px)` }}>
          {tab === 'terminal' ? (
            projectPath ? (
              <TerminalView key={projectPath} projectPath={projectPath} />
            ) : (
              <p className="p-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Select a project to open a terminal.
              </p>
            )
          ) : (
            <EventConsole events={events} agentColorMap={agentColorMap} />
          )}
        </div>
      ) : null}
    </div>
  );
}
