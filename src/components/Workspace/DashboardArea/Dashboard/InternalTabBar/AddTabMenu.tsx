import { Plus } from 'lucide-react';

import { Button } from '@/components/_ui/Button';
import { Popover, PopoverClose } from '@/components/_ui/Popover';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export function AddTabMenu() {
  const agents = useDashboardStore((s) => s.agents);
  const addTab = useWorkspaceStore((s) => s.addTab);

  const trigger = (
    <Button intent="ghost" size="icon" title="New tab" aria-label="New tab" className="w-7 h-7">
      <Plus size={15} />
    </Button>
  );

  return (
    <Popover trigger={trigger} align="start" className="w-60 max-h-80 overflow-y-auto">
      <PopoverClose asChild>
        <button
          onClick={() => addTab({ kind: 'chat', title: 'Chat' })}
          className="w-full text-left px-4 py-2 text-[13px]"
          style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-3)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          + New chat
        </button>
      </PopoverClose>
      <div
        className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-widest"
        style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border-subtle)' }}
      >
        Open agent
      </div>
      {agents.map((a) => (
        <PopoverClose asChild key={a.id}>
          <button
            onClick={() => addTab({ kind: 'agent', title: a.id, agentName: a.id })}
            className="w-full text-left px-4 py-1.5 text-[13px] truncate"
            style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {a.id}
          </button>
        </PopoverClose>
      ))}
    </Popover>
  );
}
