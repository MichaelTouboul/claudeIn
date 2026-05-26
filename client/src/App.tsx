import { useState } from "react";
import ProjectSwitcher from "./components/ProjectSwitcher";
import ProjectDashboard from "./components/ProjectDashboard";
import AgentChat from "./components/AgentChat";
import StatsBar from "./components/StatsBar";
import EventConsole from "./components/EventConsole";
import { useProjects, useDashboard } from "./hooks/useProjects";
import { useSSE } from "./hooks/useSSE";
import { useStats } from "./hooks/useStats";
import { useAppStore } from "./store/useAppStore";
import { Bot, MessageSquare } from "lucide-react";

export default function App() {
  const { projects, loading: projectsLoading } = useProjects();
  const selectedProject = useAppStore((s) => s.selectedProject);
  const setSelectedProject = useAppStore((s) => s.setSelectedProject);
  const { dashboard, loading: dashLoading, refresh } = useDashboard(selectedProject?.id ?? null);
  const { events, connected, activeAgents, agentContexts, currentTools } = useSSE();
  const { stats } = useStats(events.length);
  const [chatOpen, setChatOpen] = useState(false);

  const agentColorMap = new Map<string, string>();
  if (dashboard) {
    for (const a of dashboard.agents) {
      agentColorMap.set(a.id, a.frontmatter.color || "cyan");
    }
  }

  if (projectsLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950 text-gray-500">
        Scanning for projects...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-950 text-gray-200">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-cyan-400" />
          <span className="text-sm font-bold text-white tracking-wide">Agent Manager</span>
        </div>

        <ProjectSwitcher
          projects={projects}
          selected={selectedProject}
          onSelect={setSelectedProject}
        />

        <div className="flex-1" />

        <StatsBar stats={stats} activeCount={activeAgents.size} connected={connected} />

        <button
          onClick={() => setChatOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
        >
          <MessageSquare size={13} />
          Chat
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {!selectedProject ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Bot size={48} className="text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">Select a project</p>
              <p className="text-gray-600 text-sm mb-6">
                {projects.length} projects found on this machine
              </p>
              <div className="grid grid-cols-3 gap-3 max-w-2xl">
                {projects.slice(0, 9).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProject(p)}
                    className="text-left bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-cyan-500/50 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-200 mb-1 truncate">{p.name}</div>
                    <div className="text-xs text-gray-500 truncate">{p.path}</div>
                    <div className="flex gap-3 mt-2 text-xs text-gray-600">
                      {p.agentCount > 0 && <span>{p.agentCount} agents</span>}
                      {p.skillCount > 0 && <span>{p.skillCount} skills</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : dashLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Loading dashboard...
          </div>
        ) : dashboard ? (
          <ProjectDashboard
            project={dashboard.project}
            agents={dashboard.agents}
            skills={dashboard.skills}
            hooks={dashboard.hooks}
            activeAgents={activeAgents}
            agentContexts={agentContexts}
            currentTools={currentTools}
            onRefresh={refresh}
          />
        ) : null}

        <EventConsole events={events} agentColorMap={agentColorMap} />
      </div>

      {chatOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setChatOpen(false)} />
          <div className="w-[560px] bg-gray-950 border-l border-gray-800 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <span className="text-sm font-bold text-white">Claude Code</span>
              <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white text-lg leading-none">&times;</button>
            </div>
            <div className="flex-1 min-h-0 p-3">
              <AgentChat agentName="_main" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
