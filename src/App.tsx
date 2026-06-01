import { Bot } from "lucide-react";
import { useEffect, useMemo,useRef,useState } from "react";

import { BottomPanel } from "@/components/BottomPanel/BottomPanel";
import { Footer } from "@/components/Footer/Footer";
import { GlobalChatModal } from "@/components/GlobalChatModal/GlobalChatModal";
import { Header } from "@/components/Header/Header";
import { ProjectDashboard } from '@/components/ProjectDashboard/ProjectDashboard';
import { WorkspaceBar } from "@/components/Workspace/WorkspaceBar/WorkspaceBar";

import { useProjects } from "./hooks/useProjects";
import { useStats } from "./hooks/useStats";
import { ProjectProvider } from "./store/ProjectContext";
import { useAppStore } from "./store/useAppStore";
import { useInitChatTitles } from "./store/useChatsStore";
import { useDashboardStore } from "./store/useDashboardStore";
import { useEventsStore,useInitEvents } from "./store/useEventsStore";
import { useWorkspaceStore } from "./store/useWorkspaceStore";

export default function App() {
  const { projects, loading: projectsLoading } = useProjects();
  const selectedProject = useAppStore((s) => s.selectedProject);
  const openDashboard = useWorkspaceStore((s) => s.openDashboard);
  const project = useDashboardStore((s) => s.project);
  const agents = useDashboardStore((s) => s.agents);
  const dashLoading = useDashboardStore((s) => s.loading);
  const loadDashboard = useDashboardStore((s) => s.load);

  useEffect(() => {
    if (selectedProject?.id) {
      void loadDashboard(selectedProject.id);
    }
  }, [selectedProject?.id, loadDashboard]);

  const dashboard = project ? { project } : null;
  useInitEvents();
  useInitChatTitles();
  const events = useEventsStore((s) => s.events);
  const connected = useEventsStore((s) => s.connected);
  const activeCount = useEventsStore((s) => s.activeAgents.size);
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

  const agentColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of agents) {
      map.set(a.id, a.frontmatter.color || "cyan");
    }
    return map;
  }, [agents]);

  if (projectsLoading) {
    return (
      <div className="h-full flex items-center justify-center text-fg-subtle bg-surface-0">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono tracking-wider uppercase">Scanning projects</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col surface-grain" style={{ background: 'var(--color-surface-0)', color: 'var(--color-text-primary)' }}>
      <Header
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={openDashboard}
        stats={stats}
        activeCount={activeCount}
        connected={connected}
        onOpenChat={() => setChatOpen(true)}
      />

      {/* Main content */}
      <div className="flex-1 min-h-0 flex flex-col">
        <WorkspaceBar />
        {!selectedProject ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-3xl mx-auto px-8">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5" style={{ background: 'var(--color-accent-dim)', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
                <Bot size={24} className="text-accent" />
              </div>
              <h1 className="text-xl font-semibold mb-1.5 tracking-tight">Select a project</h1>
              <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                {projects.length} projects detected
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {projects.slice(0, 9).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => openDashboard(p)}
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
                    <div className="text-[13px] font-medium mb-1 truncate group-hover:text-accent transition-colors">{p.name}</div>
                    <div className="text-[11px] truncate mb-2.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{p.path}</div>
                    <div className="flex gap-3 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                      {p.agentCount > 0 ? <span className="font-mono tabular-nums">{p.agentCount} <span style={{ color: 'var(--color-text-muted)' }}>agents</span></span> : null}
                      {p.skillCount > 0 ? <span className="font-mono tabular-nums">{p.skillCount} <span style={{ color: 'var(--color-text-muted)' }}>skills</span></span> : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : dashLoading ? (
          <div className="flex-1 flex items-center justify-center text-fg-muted">
            Loading dashboard...
          </div>
        ) : dashboard ? (
          <ProjectProvider project={dashboard.project}>
            <ProjectDashboard />
          </ProjectProvider>
        ) : null}

        <BottomPanel events={events} agentColorMap={agentColorMap} projectPath={selectedProject?.path ?? null} />
      </div>

      <Footer />

      {chatOpen ? <GlobalChatModal onClose={() => setChatOpen(false)} /> : null}
    </div>
  );
}
