import { AgentDetail } from '@/components/AgentDetail/AgentDetail';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useDashboardUIStore } from '@/store/useDashboardUIStore';
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
  const onAgentUpdated = useDashboardUIStore((s) => s.setSelectedAgent);

  if (tab.kind === 'chat') {
    return <ChatTab tabId={tab.id} agentName={tab.agentName ?? ''} cwd={cwd} />;
  }
  if (tab.kind === 'agent') {
    const agent = agents.find((a) => a.id === tab.agentName);
    return agent
      ? <AgentDetail agent={agent} onDelete={() => {}} onAgentUpdated={onAgentUpdated} />
      : <NotFound label="Agent not found in this project." />;
  }
  const skill = skills.find((s) => s.filePath === tab.skillId);
  return skill ? <SkillDetail skill={skill} /> : <NotFound label="Skill not found in this project." />;
}
