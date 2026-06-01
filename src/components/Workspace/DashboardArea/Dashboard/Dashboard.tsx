import { useState } from 'react';

import { AgentDetail } from '@/components/AgentDetail/AgentDetail';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useDashboardUIStore } from '@/store/useDashboardUIStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { ChatTab } from './ChatTab/ChatTab';
import { InternalTabBar } from './InternalTabBar/InternalTabBar';
import { SkillDetail } from './SkillDetail/SkillDetail';
import { UtilityPanel } from './UtilityPanel/UtilityPanel';

export function Dashboard() {
  const [panelOpen, setPanelOpen] = useState(false);
  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const activeDashboardId = useWorkspaceStore((s) => s.activeDashboardId);
  const agents = useDashboardStore((s) => s.agents);
  const skills = useDashboardStore((s) => s.skills);
  const onAgentUpdated = useDashboardUIStore((s) => s.setSelectedAgent);

  const active = dashboards.find((d) => d.id === activeDashboardId);
  const tab = active?.tabs.find((t) => t.id === active.activeTabId) ?? null;

  return (
    <div className="flex-1 flex flex-col h-full relative">
      <InternalTabBar onOpenPanel={() => setPanelOpen(true)} />

      <div className="flex-1 min-h-0 overflow-hidden">
        {tab && tab.kind === 'chat' ? <ChatTab tabId={tab.id} agentName={tab.agentName ?? ''} /> : null}
        {tab && tab.kind === 'agent'
          ? (() => {
              const agent = agents.find((a) => a.id === tab.agentName);
              return agent ? (
                <AgentDetail agent={agent} onDelete={() => {}} onAgentUpdated={onAgentUpdated} />
              ) : (
                <div className="flex-1 flex items-center justify-center h-full">
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
                    Agent not found in this project.
                  </p>
                </div>
              );
            })()
          : null}
        {tab && tab.kind === 'skill'
          ? (() => {
              const skill = skills.find((s) => s.filePath === tab.skillId);
              return skill ? (
                <SkillDetail skill={skill} />
              ) : (
                <div className="flex-1 flex items-center justify-center h-full">
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
                    Skill not found in this project.
                  </p>
                </div>
              );
            })()
          : null}
      </div>

      <UtilityPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </div>
  );
}
