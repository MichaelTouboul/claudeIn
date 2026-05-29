import { useCallback,useRef, useState } from "react";

import { useAutoChatTitles } from '@/hooks/useAutoChatTitles';
import type { SkillFile } from '@/hooks/useProjects';
import { useResizableSidebar } from '@/hooks/useResizableSidebar';
import type { SessionSummary } from '@/hooks/useSessions';
import { useSessions } from '@/hooks/useSessions';
import { useProject } from '@/store/ProjectContext';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useFavoritesStore, useInitFavorites } from '@/store/useFavoritesStore';
import type { AgentFile } from '@/types/agent.types';

import { ActiveSessions } from './ActiveSessions/ActiveSessions';
import { MainContent } from './MainContent/MainContent';
import { OpenChatsList } from './OpenChatsList/OpenChatsList';
import { PanelsArea } from './PanelsArea/PanelsArea';
import { ResizeHandle } from './ResizeHandle/ResizeHandle';
import type { MainView, OpenChat } from './types';

// Inject animation keyframes
if (typeof document !== "undefined" && !document.getElementById("chat-animations")) {
  const style = document.createElement("style");
  style.id = "chat-animations";
  style.textContent = `
    @keyframes chatSlideIn {
      0% { opacity: 0; transform: translateX(-16px); max-height: 0; }
      50% { max-height: 40px; }
      100% { opacity: 1; transform: translateX(0); max-height: 40px; }
    }
  `;
  document.head.appendChild(style);
}

// ─── Main component ───

export function ProjectDashboard() {
  const { projectId, projectPath, isUserProject } = useProject();
  const agents = useDashboardStore((s) => s.agents);
  const skills = useDashboardStore((s) => s.skills);
  const hooks = useDashboardStore((s) => s.hooks);
  const toggleLink = useDashboardStore((s) => s.toggleLink);
  const [view, setView] = useState<MainView>("none");
  const [selectedAgent, setSelectedAgent] = useState<AgentFile | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillFile | null>(null);
  const [openPanels, setOpenPanels] = useState<Set<string>>(() => new Set());
  const [scopeTab, setScopeTab] = useState<"project" | "user">("project");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  useInitFavorites(projectId);
  const favoriteList = useFavoritesStore((s) => s.byProject[projectId] || []);
  const isFavorite = (type: 'agent' | 'skill' | 'hook', name: string) =>
    favoriteList.some((f) => f.item_type === type && f.item_name === name);
  const toggleFavorite = (type: 'agent' | 'skill' | 'hook', name: string) =>
    useFavoritesStore.getState().toggle(projectId, type, name);
  const { sessions, loading: sessionsLoading, conversation, conversationLoading, selectSession } = useSessions(projectPath);
  const [resumeChat, setResumeChat] = useState<{ agentName: string; sessionId: string; message: string } | null>(null);
  const [openChats, setOpenChats] = useState<OpenChat[]>([]);
  const chatIdCounter = useRef(0);

  const addOpenChat = useCallback((agentName: string, title: string) => {
    const id = `chat-${++chatIdCounter.current}-${Date.now()}`;
    setOpenChats((prev) => [
      { id, agentName, title, createdAt: Date.now(), isNew: true },
      ...prev,
    ]);
    setTimeout(() => {
      setOpenChats((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isNew: false } : c))
      );
    }, 600);
    return id;
  }, []);

  useAutoChatTitles({ setOpenChats });

  const togglePanel = (panel: string) => {
    setOpenPanels((prev) => {
      const next = new Set(prev);
      if (next.has(panel)) next.delete(panel);
      else next.add(panel);
      return next;
    });
  };

  const { width: sidebarWidth, ref: sidebarRef, startDrag: handleResizeDragStart } = useResizableSidebar();

  const projectAgents = agents.filter((a) => a.scope === "project" || (a.scope === "user" && a.linked));
  const userAgents = agents.filter((a) => a.scope === "user" && !a.linked);

  const projectSkills = skills.filter((s) => s.scope !== "user");
  const userSkills = skills.filter((s) => s.scope === "user");

  const favAgents = agents.filter((a) => isFavorite("agent", a.id));
  const favSkills = skills.filter((s) => isFavorite("skill", s.name));
  const favHooks = hooks.filter((h) => isFavorite("hook", `${h.event}:${h.matcher}`));
  const hasFavorites = favAgents.length + favSkills.length + favHooks.length > 0;

  const handleToggleLink = (agentName: string, currentlyLinked: boolean) =>
    toggleLink(agentName, currentlyLinked);

  const handleAgentAction = (action: string, agentName: string) => {
    switch (action) {
      case "edit": {
        const agent = agents.find((a) => a.id === agentName);
        if (agent) { setSelectedAgent(agent); setView("agent"); }
        break;
      }
      case "rename":
        // TODO: implement rename modal
        alert(`Rename ${agentName} — coming soon`);
        break;
      case "delete": {
        if (confirm(`Delete agent "${agentName}"?`)) {
          void useDashboardStore.getState().deleteAgent(agentName);
        }
        break;
      }
      case "add-sub":
        // TODO: implement add sub-agent modal
        alert(`Add sub-agent to ${agentName} — coming soon`);
        break;
      case "toggle-favorite":
        toggleFavorite("agent", agentName);
        break;
    }
  };

  const handleSelectAgent = (a: AgentFile) => {
    setSelectedAgent(a);
    setSelectedSkill(null);
    setView("agent");
  };

  const handleSelectSkill = (s: SkillFile) => {
    setSelectedSkill(s);
    setSelectedAgent(null);
    setView("skill");
  };

  const handleSessionResume = (sessionId: string, message: string) => {
    const session = sessions.find((s) => s.sessionId === sessionId);
    const agentName = session?.agentName || "claude";
    addOpenChat(agentName, `Resume: ${session?.title || agentName}`);
    setResumeChat({ agentName, sessionId, message });
    setView("chat");
  };

  const handleSelectSession = (s: SessionSummary) => {
    addOpenChat(s.agentName || "claude", s.title || s.firstPrompt || "Session");
    setSelectedSessionId(s.sessionId);
    selectSession(s.filePath);
    setView("session");
  };

  return (
    <div className="flex-1 flex h-full">
      {/* Sidebar with accordions */}
      <div
        ref={sidebarRef}
        className="flex flex-col h-full shrink-0 relative"
        style={{
          width: `${sidebarWidth}px`,
          background: 'var(--color-surface-1)',
          borderRight: '1px solid var(--color-border)',
        }}
      >

        <ActiveSessions
          onSelectAgent={(a) => { setSelectedAgent(a); setSelectedSkill(null); setView("agent"); }}
        />

        <OpenChatsList
          openChats={openChats}
          onSelectAgent={(a) => { setSelectedAgent(a); setSelectedSkill(null); setView("agent"); }}
        />

        <PanelsArea
          sessions={sessions}
          sessionsLoading={sessionsLoading}
          selectedAgent={selectedAgent}
          selectedSkill={selectedSkill}
          selectedSessionId={selectedSessionId}
          openPanels={openPanels}
          scopeTab={scopeTab}
          isUserProject={isUserProject}
          projectAgents={projectAgents}
          userAgents={userAgents}
          projectSkills={projectSkills}
          userSkills={userSkills}
          favAgents={favAgents}
          favSkills={favSkills}
          favHooks={favHooks}
          hasFavorites={hasFavorites}
          onTogglePanel={togglePanel}
          onSetScopeTab={setScopeTab}
          onAgentAction={handleAgentAction}
          onSelectAgent={handleSelectAgent}
          onSelectSkill={handleSelectSkill}
          onSelectSession={handleSelectSession}
          onToggleLink={handleToggleLink}
        />

        <ResizeHandle onMouseDown={handleResizeDragStart} />

      </div>

      <MainContent
        view={view}
        selectedAgent={selectedAgent}
        selectedSkill={selectedSkill}
        resumeChat={resumeChat}
        conversation={conversation}
        conversationLoading={conversationLoading}
        sessions={sessions}
        onAgentUpdated={(a) => setSelectedAgent(a)}
        onSelectAgent={handleSelectAgent}
        onSessionResume={handleSessionResume}
        onSetView={setView}
        onAddOpenChat={addOpenChat}
        onStartChat={(agentName, sessionId, message) => setResumeChat({ agentName, sessionId, message })}
        onSelectSession={handleSelectSession}
      />
    </div>
  );
}
