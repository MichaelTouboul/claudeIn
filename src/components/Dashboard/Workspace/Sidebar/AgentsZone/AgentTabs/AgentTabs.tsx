import { SegmentedControl } from '@/components/_ui/SegmentedControl';
import { AgentScope } from '@/lib/types';

export type AgentTabCounts = Record<AgentScope, number>;

const TAB_LABEL: Record<AgentScope, string> = {
  [AgentScope.Project]: 'Project',
  [AgentScope.User]: 'User',
  [AgentScope.Plugin]: 'Plugin',
};

// Locked tab order (Project → User → Plugin), matching the redesign mock.
const TAB_ORDER: AgentScope[] = [AgentScope.Project, AgentScope.User, AgentScope.Plugin];

export type AgentTabsProps = {
  value: AgentScope;
  counts: AgentTabCounts;
  onChange: (scope: AgentScope) => void;
};

/** The Project / User / Plugin segmented tabs, each labelled with its count. */
export function AgentTabs({ value, counts, onChange }: AgentTabsProps) {
  return (
    <SegmentedControl<AgentScope>
      size="sm"
      value={value}
      onChange={onChange}
      className="w-full"
      options={TAB_ORDER.map((scope) => ({
        value: scope,
        label: (
          <span className="flex items-center gap-1.5">
            {TAB_LABEL[scope]}
            <span className="font-mono text-[10px] tabular-nums opacity-60">{counts[scope]}</span>
          </span>
        ),
      }))}
    />
  );
}
