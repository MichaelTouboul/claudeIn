import { AgentDetail } from '@/components/AgentDetail/AgentDetail';
import { useDashboardStore } from '@/store/useDashboardStore';
import type { InternalTab } from '@/store/useWorkspaceStore';

import { ChatTab } from '../ChatTab/ChatTab';
import { SkillDetail } from '../SkillDetail/SkillDetail';

export type TabBodyProps = {
  tab: InternalTab;
  cwd: string;
};

function NotFound({ label }: { label: string }) {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
        {label}
      </p>
    </div>
  );
}

export function TabBody({ tab, cwd }: TabBodyProps) {
  const agents = useDashboardStore((s) => s.agents);
  const skills = useDashboardStore((s) => s.skills);
  const deleteAgent = useDashboardStore((s) => s.deleteAgent);

  if (tab.kind === 'chat') {
    return <ChatTab tabId={tab.id} agentName={tab.agentName ?? ''} cwd={cwd} />;
  }
  if (tab.kind === 'agent') {
    // The summary list is the source of truth for existence; AgentDetail fetches
    // the full content on-demand from the id. Wire delete to the store action
    // (previously a no-op) so deleting from the detail tab actually deletes.
    const summary = agents.find((a) => a.id === tab.agentName);
    return summary
      ? <AgentDetail agentId={summary.id} onDelete={(name) => void deleteAgent(name)} />
      : <NotFound label="Agent not found in this project." />;
  }
  const skill = skills.find((s) => s.filePath === tab.skillId);
  return skill ? <SkillDetail filePath={skill.filePath} /> : <NotFound label="Skill not found in this project." />;
}
