import { BarChart3, ListTodo, Map as MapIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { type TabItem, Tabs } from '@/components/_ui/Tabs';

import type { UtilityView } from '../types';
import { ContextTab } from './ContextTab/ContextTab';
import { PlanTab } from './PlanTab/PlanTab';
import { TaskTab } from './TaskTab/TaskTab';

const TABS: TabItem[] = [
  { key: 'context', label: 'Context', icon: <BarChart3 size={13} /> },
  { key: 'task', label: 'Task', icon: <ListTodo size={13} /> },
  { key: 'plan', label: 'Plan', icon: <MapIcon size={13} /> },
];

export type UtilityPanelProps = {
  open: boolean;
  onClose: () => void;
};

export function UtilityPanel({ open, onClose }: UtilityPanelProps) {
  const [view, setView] = useState<UtilityView>('context');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-40 flex justify-end">
      <button
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.4)' }}
      />
      <div
        className="relative h-full flex flex-col w-[480px] max-w-[90%]"
        style={{
          background: 'var(--color-surface-1)',
          borderLeft: '1px solid var(--color-border)',
          boxShadow: '-12px 0 48px rgba(0,0,0,0.4)',
        }}
      >
        <div
          className="flex items-center justify-between pr-2"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <Tabs tabs={TABS} active={view} onChange={(k) => setView(k as UtilityView)} className="flex-1" />
          <button
            onClick={onClose}
            title="Close"
            className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {view === 'context' ? <ContextTab /> : null}
          {view === 'task' ? <TaskTab /> : null}
          {view === 'plan' ? <PlanTab /> : null}
        </div>
      </div>
    </div>
  );
}
