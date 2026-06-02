import { useEffect, useRef, useState } from "react";

import { Footer } from "@/components/Footer/Footer";
import { GlobalChatModal } from "@/components/GlobalChatModal/GlobalChatModal";
import { Header } from "@/components/Header/Header";
import { Workspace } from "@/components/Workspace/Workspace";

import { useProjects } from "./hooks/useProjects";
import { useStats } from "./hooks/useStats";
import { useAppStore } from "./store/useAppStore";
import { useInitChatTitles } from "./store/useChatsStore";
import { useDashboardStore } from "./store/useDashboardStore";
import { useEventsStore, useInitEvents } from "./store/useEventsStore";
import { useWorkspaceStore } from "./store/useWorkspaceStore";

export default function App() {
  const { projects, loading: projectsLoading } = useProjects();
  const selectedProject = useAppStore((s) => s.selectedProject);
  const openDashboard = useWorkspaceStore((s) => s.openDashboard);
  const setHomeDir = useWorkspaceStore((s) => s.setHomeDir);
  const loadDashboard = useDashboardStore((s) => s.load);

  useEffect(() => {
    void window.api.getHomeDir().then(setHomeDir);
  }, [setHomeDir]);

  useEffect(() => {
    if (selectedProject?.id) {
      void loadDashboard(selectedProject.id);
    }
  }, [selectedProject?.id, loadDashboard]);

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
        refreshSignal={events.length}
        onOpenChat={() => setChatOpen(true)}
      />

      <div className="flex-1 min-h-0 flex flex-col">
        <Workspace projects={projects} />
      </div>

      <Footer />

      {chatOpen ? <GlobalChatModal onClose={() => setChatOpen(false)} /> : null}
    </div>
  );
}
