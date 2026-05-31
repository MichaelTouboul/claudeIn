import { Menu } from 'lucide-react';
import { useState } from 'react';

import { UtilityPanel } from '../UtilityPanel/UtilityPanel';
import { ChatTab } from './ChatTab/ChatTab';

export function ProjectView() {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col h-full relative">
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
      >
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.02em' }}
        >
          Chat
        </span>
        <button
          onClick={() => setPanelOpen(true)}
          title="Context · Task · Plan"
          className="flex items-center justify-center w-7 h-7 rounded-md"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Menu size={16} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatTab />
      </div>

      <UtilityPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </div>
  );
}
