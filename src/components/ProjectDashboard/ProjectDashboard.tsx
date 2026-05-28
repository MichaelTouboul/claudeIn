import { useState, useRef, useCallback, type ReactNode } from "react";
import {
  Bot, Wrench, Settings, BarChart3, Globe, User,
  Star, Terminal, GitBranch, History,
} from "lucide-react";

import type { AgentFile } from '@/types/agent.types';
import type { SkillFile, HookConfig, Project } from '@/hooks/useProjects';
import type { AgentContext } from '@/hooks/useIPC';
import { useFavorites } from '@/hooks/useFavorites';
import { useSessions } from '@/hooks/useSessions';
import { useAutoChatTitles } from '@/hooks/useAutoChatTitles';
import { useResizableSidebar } from '@/hooks/useResizableSidebar';
import { AgentDetail } from '@/components/AgentDetail/AgentDetail';
import { AgentTree } from '@/components/AgentTree/AgentTree';
import { CostDashboard } from '@/components/CostDashboard/CostDashboard';
import { SessionList } from '@/components/SessionList/SessionList';
import { SessionViewer } from '@/components/SessionViewer/SessionViewer';
import { Accordion } from '@/components/_ui/Accordion';
import { AgentList } from './AgentList/AgentList';
import { AgentChat } from '@/components/AgentChat/AgentChat';
import type { MainView, OpenChat } from './types';
import { SectionLabel } from './SectionLabel/SectionLabel';
import { SkillRow } from './SkillRow/SkillRow';
import { HookRow } from './HookRow/HookRow';
import { SkillDetail } from './SkillDetail/SkillDetail';
import { ActiveSessions } from './ActiveSessions/ActiveSessions';
import { OpenChatsList } from './OpenChatsList/OpenChatsList';
import { ResizeHandle } from './ResizeHandle/ResizeHandle';

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

export type ProjectDashboardProps = {
  project: Project;
  agents: AgentFile[];
  skills: SkillFile[];
  hooks: HookConfig[];
  activeAgents: Set<string>;
  agentContexts: Map<string, AgentContext>;
  currentTools?: Map<string, string>;
  waitingAgents?: Set<string>;
  onRefresh: () => void;
};

// ─── Main component ───

export function ProjectDashboard({
  project,
  agents,
  skills,
  hooks,
  activeAgents,
  agentContexts,
  currentTools,
  waitingAgents,
  onRefresh,
}: ProjectDashboardProps) {
  const [view, setView] = useState<MainView>("none");
  const [selectedAgent, setSelectedAgent] = useState<AgentFile | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillFile | null>(null);
  const [openPanels, setOpenPanels] = useState<Set<string>>(() => new Set());
  const [scopeTab, setScopeTab] = useState<"project" | "user">("project");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const { isFavorite, toggle: toggleFavorite } = useFavorites(project.id);
  const { sessions, loading: sessionsLoading, conversation, conversationLoading, selectSession } = useSessions(project.path);
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

  const isUserProject = project.id === "user";

  const projectAgents = agents.filter((a: any) => a.scope === "project" || (a.scope === "user" && a.linked));
  const userAgents = agents.filter((a: any) => a.scope === "user" && !a.linked);

  const projectSkills = skills.filter((s) => s.scope !== "user");
  const userSkills = skills.filter((s) => s.scope === "user");

  const favAgents = agents.filter((a) => isFavorite("agent", a.id));
  const favSkills = skills.filter((s) => isFavorite("skill", s.name));
  const favHooks = hooks.filter((h) => isFavorite("hook", `${h.event}:${h.matcher}`));
  const hasFavorites = favAgents.length + favSkills.length + favHooks.length > 0;

  const handleToggleLink = async (agentName: string, currentlyLinked: boolean) => {
    if (currentlyLinked) {
      await window.api.unlinkAgent(agentName, project.id);
    } else {
      await window.api.linkAgent(agentName, project.id);
    }
    onRefresh();
  };

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
      case "delete":
        if (confirm(`Delete agent "${agentName}"?`)) {
          window.api.deleteAgent(agentName).then(() => onRefresh());
        }
        break;
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
          agents={agents}
          activeAgents={activeAgents}
          agentContexts={agentContexts}
          waitingAgents={waitingAgents}
          onSelectAgent={(a) => { setSelectedAgent(a); setSelectedSkill(null); setView("agent"); }}
        />

        <OpenChatsList
          agents={agents}
          openChats={openChats}
          activeAgents={activeAgents}
          onSelectAgent={(a) => { setSelectedAgent(a); setSelectedSkill(null); setView("agent"); }}
        />

        {/* Panels area — panels anchored at bottom, expand upward when opened */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Spacer pushes panels to bottom when all are closed */}
          {!openPanels.size && <div className="flex-1" />}

          {([
          hasFavorites ? {
            key: "favorites",
            label: "Favorites",
            icon: <Star size={11} className="text-yellow-400" />,
            count: favAgents.length + favSkills.length + favHooks.length,
            content: (
              <>
                {favAgents.length > 0 && (
                  <>
                    <SectionLabel icon={<Bot size={10} className="text-cyan-400" />} label="Agents" />
                    <AgentList agents={favAgents} allAgents={agents} selectedId={selectedAgent?.id ?? null} onSelect={handleSelectAgent} onAgentAction={handleAgentAction} isAgentFavorite={(n) => isFavorite("agent", n)} activeAgents={activeAgents} agentContexts={agentContexts} />
                  </>
                )}
                {favSkills.length > 0 && (
                  <>
                    <SectionLabel icon={<Wrench size={10} className="text-green-400" />} label="Skills" />
                    {favSkills.map((s) => (
                      <SkillRow key={s.filePath} skill={s} selected={selectedSkill?.filePath === s.filePath} isFavorite onSelect={handleSelectSkill} onToggleFavorite={() => toggleFavorite("skill", s.name)} />
                    ))}
                  </>
                )}
                {favHooks.length > 0 && (
                  <>
                    <SectionLabel icon={<Settings size={10} className="text-yellow-400" />} label="Hooks" />
                    {favHooks.map((h, i) => (
                      <HookRow key={i} hook={h} isFavorite onToggleFavorite={() => toggleFavorite("hook", `${h.event}:${h.matcher}`)} />
                    ))}
                  </>
                )}
              </>
            ),
          } : null,
          {
            key: "agents",
            label: "Agents",
            icon: <Bot size={11} className="text-cyan-400" />,
            count: agents.length,
            content: isUserProject ? (
              <AgentList agents={agents} allAgents={agents} selectedId={selectedAgent?.id ?? null} onSelect={handleSelectAgent} onAgentAction={handleAgentAction} isAgentFavorite={(n) => isFavorite("agent", n)} activeAgents={activeAgents} agentContexts={agentContexts} />
            ) : (
              <div>
                <div
                  className="flex items-center gap-px px-2 mb-2 p-0.5 rounded-lg"
                  style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border-subtle)' }}
                >
                  <button
                    onClick={() => setScopeTab("project")}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all duration-200"
                    style={scopeTab === "project" ? {
                      background: 'var(--color-accent-dim)',
                      color: 'var(--color-accent)',
                      boxShadow: 'inset 0 0 8px rgba(6,182,212,0.08)',
                    } : {
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    <Globe size={10} />
                    Project
                    <span style={{ fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1", fontSize: '10px', opacity: 0.6 }}>{projectAgents.length}</span>
                  </button>
                  <button
                    onClick={() => setScopeTab("user")}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all duration-200"
                    style={scopeTab === "user" ? {
                      background: 'rgba(234, 179, 8, 0.1)',
                      color: '#eab308',
                      boxShadow: 'inset 0 0 8px rgba(234,179,8,0.06)',
                    } : {
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    <User size={10} />
                    User
                    <span style={{ fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1", fontSize: '10px', opacity: 0.6 }}>{userAgents.length}</span>
                  </button>
                </div>
                {scopeTab === "project" ? (
                  projectAgents.length > 0 ? (
                    <AgentList agents={projectAgents} allAgents={agents} selectedId={selectedAgent?.id ?? null} onSelect={handleSelectAgent} onAgentAction={handleAgentAction} onToggleLink={(name) => handleToggleLink(name, true)} linkAction="unlink" isAgentFavorite={(n) => isFavorite("agent", n)} activeAgents={activeAgents} agentContexts={agentContexts} />
                  ) : (
                    <div className="px-3 py-6 text-center">
                      <p className="text-xs text-gray-500 mb-1.5">No project agents</p>
                      <p className="text-[10px] text-gray-600 leading-relaxed">Link user agents or create agents in <code className="text-cyan-500/80 bg-cyan-500/8 px-1 py-0.5 rounded">.claude/agents/</code></p>
                    </div>
                  )
                ) : (
                  userAgents.length > 0 ? (
                    <AgentList agents={userAgents} allAgents={agents} selectedId={selectedAgent?.id ?? null} onSelect={handleSelectAgent} onAgentAction={handleAgentAction} onToggleLink={(name) => handleToggleLink(name, false)} linkAction="link" isAgentFavorite={(n) => isFavorite("agent", n)} activeAgents={activeAgents} agentContexts={agentContexts} />
                  ) : (
                    <p className="px-3 py-6 text-xs text-gray-500 text-center">No user agents</p>
                  )
                )}
              </div>
            ),
          },
          (projectSkills.length > 0 || userSkills.length > 0) ? {
            key: "skills",
            label: "Skills",
            icon: <Wrench size={11} className="text-green-400" />,
            count: projectSkills.length + userSkills.length,
            content: isUserProject ? (
              skills.map((s) => (
                <SkillRow key={s.filePath} skill={s} selected={selectedSkill?.filePath === s.filePath} isFavorite={isFavorite("skill", s.name)} onSelect={handleSelectSkill} onToggleFavorite={() => toggleFavorite("skill", s.name)} />
              ))
            ) : (
              <>
                {projectSkills.length > 0 && (
                  <>
                    <SectionLabel icon={<Globe size={10} className="text-cyan-400" />} label="Project" />
                    {projectSkills.map((s) => (
                      <SkillRow key={s.filePath} skill={s} selected={selectedSkill?.filePath === s.filePath} isFavorite={isFavorite("skill", s.name)} onSelect={handleSelectSkill} onToggleFavorite={() => toggleFavorite("skill", s.name)} />
                    ))}
                  </>
                )}
                {userSkills.length > 0 && (
                  <>
                    <SectionLabel icon={<User size={10} className="text-gray-500" />} label="User" />
                    <div className="opacity-60">
                      {userSkills.map((s) => (
                        <SkillRow key={s.filePath} skill={s} selected={selectedSkill?.filePath === s.filePath} isFavorite={isFavorite("skill", s.name)} onSelect={handleSelectSkill} onToggleFavorite={() => toggleFavorite("skill", s.name)} />
                      ))}
                    </div>
                  </>
                )}
              </>
            ),
          } : null,
          {
            key: "sessions",
            label: "Sessions",
            icon: <History size={11} className="text-purple-400" />,
            count: sessions.length,
            content: sessionsLoading ? (
              <p className="text-xs text-gray-600 text-center py-4">Loading sessions...</p>
            ) : (
              <SessionList
                sessions={sessions}
                selectedId={selectedSessionId}
                onSelect={(s) => {
                  setSelectedSessionId(s.sessionId);
                  selectSession(s.filePath);
                  setSelectedAgent(null);
                  setSelectedSkill(null);
                  setView("session");
                }}
              />
            ),
          },
          hooks.length > 0 ? {
            key: "hooks",
            label: "Hooks",
            icon: <Settings size={11} className="text-yellow-400" />,
            count: hooks.length,
            content: hooks.map((h, i) => (
              <HookRow key={i} hook={h} isFavorite={isFavorite("hook", `${h.event}:${h.matcher}`)} onToggleFavorite={() => toggleFavorite("hook", `${h.event}:${h.matcher}`)} />
            )),
          } : null,
          ].filter(Boolean) as { key: string; label: string; icon: ReactNode; count: number; content: ReactNode }[])
            .map((panel) => (
              <Accordion
                key={panel.key}
                label={panel.label}
                icon={panel.icon}
                count={panel.count}
                open={openPanels.has(panel.key)}
                onToggle={() => togglePanel(panel.key)}
                onRefresh={onRefresh}
                flex
              >
                {panel.content}
              </Accordion>
            ))
          }
        </div>

        <ResizeHandle onMouseDown={handleResizeDragStart} />

      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <div
          className="flex items-center gap-1 px-4 py-2"
          style={{
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface-1)',
          }}
        >
          {([
            { key: "tree" as MainView, icon: <GitBranch size={13} />, label: "Tree" },
            { key: "session" as MainView, icon: <History size={13} />, label: "Sessions" },
            { key: "costs" as MainView, icon: <BarChart3 size={13} />, label: "Costs" },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.02em',
                ...(view === tab.key ? {
                  background: 'var(--color-surface-3)',
                  color: 'var(--color-text-primary)',
                  boxShadow: '0 0 8px rgba(6, 182, 212, 0.06)',
                } : {
                  color: 'var(--color-text-muted)',
                }),
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {view === "agent" && selectedAgent ? (
            <AgentDetail agent={selectedAgent} onDelete={() => {}} onRefresh={onRefresh} onAgentUpdated={(a) => setSelectedAgent(a)} isFavorite={isFavorite("agent", selectedAgent.id)} onToggleFavorite={() => toggleFavorite("agent", selectedAgent.id)} />
          ) : view === "skill" && selectedSkill ? (
            <SkillDetail skill={selectedSkill} isFavorite={isFavorite("skill", selectedSkill.name)} onToggleFavorite={() => toggleFavorite("skill", selectedSkill.name)} />
          ) : view === "tree" ? (
            <AgentTree
              agents={agents}
              activeAgents={activeAgents}
              agentContexts={agentContexts}
              currentTools={currentTools}
              selectedId={selectedAgent?.id ?? null}
              onSelect={handleSelectAgent}
            />
          ) : view === "session" ? (
            <SessionViewer conversation={conversation} loading={conversationLoading} onResume={handleSessionResume} />
          ) : view === "chat" && resumeChat ? (
            <AgentChat agentName={resumeChat.agentName} resumeSessionId={resumeChat.sessionId} initialMessage={resumeChat.message} />
          ) : view === "costs" ? (
            <CostDashboard />
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="max-w-2xl mx-auto px-8 py-10 space-y-8">

                {/* Header */}
                <div>
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {project.name || project.id}
                  </h2>
                  <p
                    className="text-xs mt-1"
                    style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                  >
                    {project.path}
                  </p>
                </div>

                {/* 1. New Chat */}
                <div>
                  <button
                    onClick={() => {
                      addOpenChat("claude", "New chat");
                      setResumeChat({ agentName: "claude", sessionId: "", message: "" });
                      setView("chat");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
                    style={{
                      background: 'var(--color-surface-1)',
                      border: '1px solid var(--color-border)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-surface-2)';
                      e.currentTarget.style.borderColor = 'var(--color-accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--color-surface-1)';
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(6,182,212,0.1)' }}
                    >
                      <Terminal size={16} style={{ color: 'var(--color-accent)' }} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        New chat
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                        Start a fresh conversation with Claude
                      </p>
                    </div>
                  </button>
                </div>

                {/* 2. Continue a session */}
                {sessions.length > 0 && (
                  <div>
                    <h3
                      className="text-[11px] font-semibold uppercase tracking-widest mb-2 px-1"
                      style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                    >
                      Recent sessions
                    </h3>
                    <div className="space-y-0.5">
                      {sessions.slice(0, 5).map((s) => {
                        const timeAgo = s.lastActiveAt
                          ? (() => {
                              const diff = Date.now() - new Date(s.lastActiveAt).getTime();
                              const mins = Math.floor(diff / 60000);
                              if (mins < 1) return "now";
                              if (mins < 60) return `${mins}m ago`;
                              const hours = Math.floor(mins / 60);
                              if (hours < 24) return `${hours}h ago`;
                              return `${Math.floor(hours / 24)}d ago`;
                            })()
                          : "";
                        return (
                          <button
                            key={s.sessionId}
                            onClick={() => {
                              addOpenChat(s.agentName || "claude", s.title || s.firstPrompt || "Session");
                              setSelectedSessionId(s.sessionId);
                              selectSession(s.filePath);
                              setView("session");
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
                            style={{ background: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <History size={13} style={{ color: '#a855f7' }} className="shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-xs font-medium truncate"
                                style={{ color: 'var(--color-text-primary)' }}
                              >
                                {s.title || s.firstPrompt || s.sessionId.slice(0, 8)}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {s.agentName ? (
                                  <span className="text-[10px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                                    {s.agentName}
                                  </span>
                                ) : null}
                                {s.branch ? (
                                  <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                                    <GitBranch size={8} />{s.branch}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <span
                              className="text-[10px] shrink-0"
                              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                            >
                              {timeAgo}
                            </span>
                          </button>
                        );
                      })}
                      {sessions.length > 5 && (
                        <button
                          onClick={() => setView("session")}
                          className="w-full text-center py-1.5 text-[11px] rounded-lg transition-colors"
                          style={{ color: 'var(--color-text-muted)' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                        >
                          View all {sessions.length} sessions &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Chat with an agent */}
                {agents.length > 0 && (
                  <div>
                    <h3
                      className="text-[11px] font-semibold uppercase tracking-widest mb-2 px-1"
                      style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                    >
                      Agents
                    </h3>
                    <div className="space-y-0.5">
                      {(() => {
                        const colorHex: Record<string, string> = {
                          cyan: "#06b6d4", blue: "#3b82f6", green: "#22c55e",
                          yellow: "#eab308", orange: "#f97316", red: "#ef4444",
                          purple: "#a855f7", pink: "#ec4899",
                        };
                        // Orchestrators first (agents with subAgents), then others
                        const sorted = [...agents].sort((a, b) => {
                          const aOrch = a.subAgents.length > 0 ? 0 : 1;
                          const bOrch = b.subAgents.length > 0 ? 0 : 1;
                          if (aOrch !== bOrch) return aOrch - bOrch;
                          return a.frontmatter.name.localeCompare(b.frontmatter.name);
                        });
                        return sorted.map((agent) => {
                          const color = colorHex[agent.frontmatter.color || ""] || "#6b7280";
                          const isOrch = agent.subAgents.length > 0;
                          return (
                            <button
                              key={agent.id}
                              onClick={() => {
                                addOpenChat(agent.frontmatter.name, `Chat with ${agent.frontmatter.name}`);
                                setSelectedAgent(agent);
                                setSelectedSkill(null);
                                setView("agent");
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
                              style={{ background: 'transparent' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-1)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="text-xs font-medium truncate"
                                    style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
                                  >
                                    {agent.frontmatter.name}
                                  </span>
                                  {isOrch ? (
                                    <span
                                      className="text-[9px] px-1.5 py-0.5 rounded shrink-0"
                                      style={{
                                        background: 'rgba(6,182,212,0.1)',
                                        color: 'var(--color-accent)',
                                        border: '1px solid rgba(6,182,212,0.15)',
                                      }}
                                    >
                                      orchestrator
                                    </span>
                                  ) : null}
                                </div>
                                {agent.frontmatter.description ? (
                                  <p
                                    className="text-[10px] truncate mt-0.5"
                                    style={{ color: 'var(--color-text-muted)' }}
                                  >
                                    {agent.frontmatter.description}
                                  </p>
                                ) : null}
                              </div>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
