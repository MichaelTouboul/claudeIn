import { BarChart3, ListTodo, Map as MapIcon, MessageSquare } from 'lucide-react';

import { type TabItem,Tabs } from '@/components/_ui/Tabs';
import { useDashboardUIStore } from '@/store/useDashboardUIStore';

import type { ProjectTab } from '../types';
import { ChatTab } from './ChatTab/ChatTab';
import { ContextTab } from './ContextTab/ContextTab';
import { PlanTab } from './PlanTab/PlanTab';
import { TaskTab } from './TaskTab/TaskTab';

const TABS: TabItem[] = [
  { key: 'chat', label: 'Chat', icon: <MessageSquare size={13} /> },
  { key: 'context', label: 'Context', icon: <BarChart3 size={13} /> },
  { key: 'task', label: 'Task', icon: <ListTodo size={13} /> },
  { key: 'plan', label: 'Plan', icon: <MapIcon size={13} /> },
];

export function ProjectView() {
  const projectTab = useDashboardUIStore((s) => s.projectTab);
  const setProjectTab = useDashboardUIStore((s) => s.setProjectTab);

  return (
    <div className="flex-1 flex flex-col h-full">
      <Tabs tabs={TABS} active={projectTab} onChange={(k) => setProjectTab(k as ProjectTab)} />
      <div className="flex-1 min-h-0 overflow-hidden">
        {projectTab === 'chat' ? <ChatTab /> : null}
        {projectTab === 'context' ? <ContextTab /> : null}
        {projectTab === 'task' ? <TaskTab /> : null}
        {projectTab === 'plan' ? <PlanTab /> : null}
      </div>
    </div>
  );
}
