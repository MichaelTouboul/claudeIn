import { useState, useEffect, useRef } from "react";
import ProjectSwitcher from "./components/ProjectSwitcher";
import ProjectDashboard from "./components/ProjectDashboard";
import GlobalChatModal from "./components/GlobalChatModal";
import StatsBar from "./components/StatsBar";
import EventConsole from "./components/EventConsole";
import { useProjects, useDashboard } from "./hooks/useProjects";
import { useIPC } from "./hooks/useIPC";
import { useStats } from "./hooks/useStats";
import { useAppStore } from "./store/useAppStore";
import { Bot, MessageSquare } from "lucide-react";

export default function App() {
  const { projects, loading: projectsLoading } = useProjects();
  const selectedProject = useAppStore((s) => s.selectedProject);
  const setSelectedProject = useAppStore((s) => s.setSelectedProject);
  const { dashboard, loading: dashLoading, refresh } = useDashboard(selectedProject?.id ?? null);
  const { events, connected, activeAgents, agentContexts, currentTools } = useIPC();
  const { stats } = useStats(events.length);
  const [chatOpen, setChatOpen] = useState(false);
  const prevProjectPath = useRef<string | null>(null);

  useEffect(() => {
    if (prevProjectPath.current) {
      window.api.unwatchSessions(prevProjectPath.current);
    }
    if (selectedProject) {
      window.api.watchSessions(selectedProject.path);
      prevProjectPath.current = selectedProject.path;
    } else {
      prevProjectPath.current = null;
    }
    return () => {
      if (prevProjectPath.current) {
        window.api.unwatchSessions(prevProjectPath.current);
      }
    };
  }, [selectedProject]);

  const agentColorMap = new Map<string, string>();
  if (dashboard) {
    for (const a of dashboard.agents) {
      agentColorMap.set(a.id, a.frontmatter.color || "cyan");
    }
  }

  if (projectsLoading) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--color-text-muted)]" style={{ background: 'var(--color-surface-0)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono tracking-wider uppercase">Scanning projects</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col surface-grain" style={{ background: 'var(--color-surface-0)', color: 'var(--color-text-primary)' }}>
      {/* Top bar */}
      <div className="titlebar-drag flex items-center gap-4 pl-20 pr-4 py-2" style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2.5">
          <Bot size={16} className="text-[var(--color-accent)]" />
          <span className="text-[13px] font-semibold tracking-[0.02em]" style={{ fontFamily: 'var(--font-mono)' }}>Agent Manager</span>
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
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-[var(--color-accent)] transition-all duration-200 hover:bg-[var(--color-accent-dim)] glow-cyan"
          style={{ border: '1px solid rgba(6, 182, 212, 0.25)' }}
        >
          <MessageSquare size={12} />
          Chat
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {!selectedProject ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-3xl mx-auto px-8">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5" style={{ background: 'var(--color-accent-dim)', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
                <Bot size={24} className="text-[var(--color-accent)]" />
              </div>
              <h1 className="text-xl font-semibold mb-1.5 tracking-tight">Select a project</h1>
              <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                {projects.length} projects detected
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {projects.slice(0, 9).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProject(p)}
                    className="text-left rounded-lg p-4 transition-all duration-200 hover:translate-y-[-1px] group"
                    style={{
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(6, 182, 212, 0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div className="text-[13px] font-medium mb-1 truncate group-hover:text-[var(--color-accent)] transition-colors">{p.name}</div>
                    <div className="text-[11px] truncate mb-2.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{p.path}</div>
                    <div className="flex gap-3 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                      {p.agentCount > 0 && <span className="font-mono tabular-nums">{p.agentCount} <span style={{ color: 'var(--color-text-muted)' }}>agents</span></span>}
                      {p.skillCount > 0 && <span className="font-mono tabular-nums">{p.skillCount} <span style={{ color: 'var(--color-text-muted)' }}>skills</span></span>}
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

      {chatOpen && <GlobalChatModal onClose={() => setChatOpen(false)} />}
    </div>
  );
}
