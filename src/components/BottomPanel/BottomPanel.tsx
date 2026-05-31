import { Activity, ChevronDown, ChevronUp, Terminal as TerminalIcon } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { EventConsole } from '@/components/EventConsole/EventConsole';
import type { LiveEvent } from '@/types/events.types';

import { TerminalView } from './TerminalView/TerminalView';

type Tab = 'terminal' | 'events';

export type BottomPanelProps = {
  events: LiveEvent[];
  agentColorMap: Map<string, string>;
  projectPath: string | null;
};

export function BottomPanel({ events, agentColorMap, projectPath }: BottomPanelProps) {
  const [tab, setTab] = useState<Tab>('terminal');
  const [expanded, setExpanded] = useState(true);

  const tabBtn = (id: Tab, label: string, icon: ReactNode) => (
    <button
      onClick={() => {
        setTab(id);
        setExpanded(true);
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
        height: expanded ? '15rem' : '2.25rem',
      }}
    >
      <div className="flex items-center" style={{ background: 'var(--color-surface-1)' }}>
        {tabBtn('terminal', 'Terminal', <TerminalIcon size={12} />)}
        {tabBtn('events', `Events (${events.length})`, <Activity size={12} />)}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto px-3 py-2"
          style={{ color: 'var(--color-text-muted)' }}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
      </div>
      {expanded ? (
        <div style={{ height: 'calc(100% - 36px)' }}>
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
