import { WorkspaceBar } from '../WorkspaceBar/WorkspaceBar';
import { Console } from './Console/Console';
import { Dashboard } from './Dashboard/Dashboard';

export function DashboardArea() {
  return (
    <div className="flex-1 min-w-0 flex flex-col h-full">
      <WorkspaceBar />
      <div className="flex-1 min-h-0 overflow-hidden">
        <Dashboard />
      </div>
      <Console />
    </div>
  );
}
