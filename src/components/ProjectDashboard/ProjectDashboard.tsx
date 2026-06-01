import { Sidebar } from '@/components/Workspace/Sidebar/Sidebar';

import { ProjectView } from './ProjectView/ProjectView';

export function ProjectDashboard() {
  return (
    <div className="flex-1 flex h-full">
      <Sidebar />
      <ProjectView />
    </div>
  );
}
