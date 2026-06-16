import { type ReactNode } from 'react';

import { AgentScope } from '@/lib/types';

const EMPTY_COPY: Record<AgentScope, { title: string; hint: ReactNode }> = {
  [AgentScope.Project]: {
    title: 'No project agents',
    hint: (
      <>
        Link user agents or create agents in{' '}
        <code className="rounded bg-accent/10 px-1 py-0.5 text-accent/80">.claude/agents/</code>
      </>
    ),
  },
  [AgentScope.User]: { title: 'No user agents', hint: null },
  [AgentScope.Plugin]: {
    title: 'No plugin agents',
    hint: 'Installed plugins that ship agents will appear here.',
  },
};

export type AgentsEmptyProps = {
  scope: AgentScope;
  /** When true the list is non-empty but the filter matched nothing. */
  filtered?: boolean;
};

/** Per-scope empty state for the agents zone (incl. the Plugin tab). */
export function AgentsEmpty({ scope, filtered = false }: AgentsEmptyProps) {
  if (filtered) {
    return <p className="px-3 py-6 text-center text-xs text-fg-muted">No matching agents</p>;
  }
  const copy = EMPTY_COPY[scope];
  return (
    <div className="px-3 py-6 text-center">
      <p className="mb-1.5 text-xs text-fg-muted">{copy.title}</p>
      {copy.hint ? <p className="text-[10px] leading-relaxed text-fg-subtle">{copy.hint}</p> : null}
    </div>
  );
}
