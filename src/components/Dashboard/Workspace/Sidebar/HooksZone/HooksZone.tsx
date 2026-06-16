import { Search } from 'lucide-react';
import { useState } from 'react';

import { Input } from '@/components/_ui/Input';
import type { HookConfig } from '@/hooks/useProjects';

import { HookRow } from '../HookRow/HookRow';

export type HooksZoneProps = {
  hooks: HookConfig[];
};

/** Narrow a hook list by a case-insensitive substring of event/matcher/command. */
function filterHooks(hooks: HookConfig[], query: string): HookConfig[] {
  const q = query.trim().toLowerCase();
  if (!q) return hooks;
  return hooks.filter(
    (h) =>
      h.event.toLowerCase().includes(q) ||
      h.matcher.toLowerCase().includes(q) ||
      h.command.toLowerCase().includes(q),
  );
}

/**
 * The drilled-in Hooks list: a filter input above the redesigned hook rows —
 * the same grammar as AgentsZone (hooks carry no scope, so no tabs/badge).
 */
export function HooksZone({ hooks }: HooksZoneProps) {
  const [query, setQuery] = useState('');
  const visible = filterHooks(hooks, query);

  return (
    <div className="flex flex-col min-h-0">
      <div className="px-3 pb-2.5 pt-1">
        <Input
          size="sm"
          placeholder="Filter hooks…"
          leadingIcon={<Search size={13} />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter hooks"
        />
      </div>
      <div className="flex-1 overflow-y-auto pt-0.5 space-y-0.5">
        {visible.length > 0 ? (
          visible.map((h) => <HookRow key={`${h.event}:${h.matcher}`} hook={h} />)
        ) : (
          <p className="px-3 py-6 text-center text-xs text-fg-muted">
            {hooks.length > 0 ? 'No matching hooks' : 'No hooks'}
          </p>
        )}
      </div>
    </div>
  );
}
