import { Dashboard } from '@/components/Workspace/DashboardArea/Dashboard/Dashboard';
import { Sidebar } from '@/components/Workspace/Sidebar/Sidebar';

export function ProjectDashboard() {
  return (
    <div className="flex-1 flex h-full">
      <Sidebar />
      <Dashboard />
    </div>
  );
}
