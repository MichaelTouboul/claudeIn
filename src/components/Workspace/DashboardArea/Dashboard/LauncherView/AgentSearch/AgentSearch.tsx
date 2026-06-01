import { useEffect, useMemo, useState } from 'react';

import { api } from '@/services/api';
import type { AgentFile } from '@/types/agent.types';

export type AgentSearchProps = {
  onSelect: (agentName: string) => void;
};

export function AgentSearch({ onSelect }: AgentSearchProps) {
  const [agents, setAgents] = useState<AgentFile[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    void api.getAgents().then((list) => {
      if (!cancelled) setAgents(list);
    });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((a) => a.id.toLowerCase().includes(q));
  }, [agents, query]);

  return (
    <div className="flex flex-col gap-2">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search agents…"
        aria-label="Search agents"
        className="w-full px-3 py-1.5 rounded-md text-[13px] outline-none"
        style={{
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-mono)',
        }}
      />
      <div className="max-h-52 overflow-y-auto rounded-md" style={{ border: '1px solid var(--color-border-subtle)' }}>
        {filtered.length === 0 ? (
          <p className="px-3 py-2 text-[11px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
            No agents match.
          </p>
        ) : (
          filtered.map((a) => (
            <button
              key={a.id}
              onClick={() => onSelect(a.id)}
              className="w-full text-left px-3 py-2 transition-colors"
              style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-3)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span className="text-[13px] truncate block">{a.id}</span>
              {a.folder ? (
                <span className="text-[10px] truncate block" style={{ color: 'var(--color-text-muted)' }}>
                  {a.folder}
                </span>
              ) : null}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
