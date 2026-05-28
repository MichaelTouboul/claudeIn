import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import {
  Bot, Wrench, Settings, BarChart3, Globe, User,
  Link, Unlink, Network, Cog, Star, Terminal, GitBranch, History, MessageSquare,
} from "lucide-react";

import type { AgentFile } from '@/types/agent.types';
import type { SkillFile, HookConfig, Project } from '@/hooks/useProjects';
import type { AgentContext } from '@/hooks/useIPC';
import { useFavorites } from '@/hooks/useFavorites';
import { useSessions } from '@/hooks/useSessions';
import { AgentDetail } from '@/components/AgentDetail/AgentDetail';
import { AgentTree } from '@/components/AgentTree/AgentTree';
import { CostDashboard } from '@/components/CostDashboard/CostDashboard';
import { SessionList } from '@/components/SessionList/SessionList';
import { SessionViewer } from '@/components/SessionViewer/SessionViewer';
import { Accordion } from '@/components/_ui/Accordion';
import { AgentContextMenu } from '@/components/AgentContextMenu/AgentContextMenu';
import { ItemContextMenu } from '@/components/ItemContextMenu/ItemContextMenu';
import { AgentChat } from '@/components/AgentChat/AgentChat';
import type { MainView, OpenChat, SkillTab } from './types';
import { colorMap } from './utils';
import { ContextBar } from './ContextBar/ContextBar';
import { SectionLabel } from './SectionLabel/SectionLabel';

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

// ─── Agent rows ───

function OrchestratorTree({
  orchestrator,
  allAgents,
  selectedId,
  onSelect,
  onAgentAction,
  onToggleLink,
  linkAction,
  isAgentFavorite,
  activeAgents,
  agentContexts,
}: {
  orchestrator: AgentFile;
  allAgents: AgentFile[];
  selectedId: string | null;
  onSelect: (a: AgentFile) => void;
  onAgentAction: (action: string, agentName: string) => void;
  onToggleLink?: (name: string) => void;
  linkAction?: "link" | "unlink";
  isAgentFavorite?: (name: string) => boolean;
  activeAgents?: Set<string>;
  agentContexts?: Map<string, AgentContext>;
}) {
  const agentMap = new Map(allAgents.map((a) => [a.id, a]));
  const subs = orchestrator.subAgents
    .map((id) => agentMap.get(id))
    .filter((a): a is AgentFile => !!a);

  const orchActive = activeAgents?.has(orchestrator.id);
  const orchCtx = agentContexts?.get(orchestrator.id);

  return (
    <div className="mb-1">
      <div className="flex items-center group">
        <button
          onClick={() => onSelect(orchestrator)}
          className={`relative flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-colors overflow-hidden ${
            selectedId === orchestrator.id ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-800"
          }`}
        >
          {orchActive && orchCtx && orchCtx.percent > 0 && (
            <ContextBar percent={orchCtx.percent} tokensIn={orchCtx.tokensIn} tokensOut={orchCtx.tokensOut} costUsd={orchCtx.costUsd} />
          )}
          <Network size={14} className={`relative shrink-0 ${orchActive ? "text-green-400 animate-pulse" : "text-cyan-400"}`} />
          <span className="relative truncate text-sm font-medium">{orchestrator.id}</span>
        </button>
        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <AgentContextMenu agentName={orchestrator.id} isOrchestrator isFavorite={isAgentFavorite?.(orchestrator.id)} onAction={onAgentAction} />
        </div>
        {onToggleLink && linkAction && (
          <button
            onClick={() => onToggleLink(orchestrator.id)}
            className={`p-1.5 mr-1 rounded shrink-0 transition-colors ${
              linkAction === "link"
                ? "text-gray-600 hover:text-green-400 hover:bg-green-500/10"
                : "text-green-400/60 hover:text-red-400 hover:bg-red-500/10"
            }`}
            title={linkAction === "link" ? "Link orchestrator + sub-agents" : "Unlink all"}
          >
            {linkAction === "link" ? <Link size={12} /> : <Unlink size={12} />}
          </button>
        )}
      </div>
      {subs.length > 0 && (
        <div className="ml-4 border-l border-gray-800 pl-1 space-y-0.5">
          {subs.map((sub) => {
            const subActive = activeAgents?.has(sub.id);
            const subCtx = agentContexts?.get(sub.id);
            return (
            <div key={sub.id} className="flex items-center group">
              <button
                onClick={() => onSelect(sub)}
                className={`relative flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors overflow-hidden ${
                  selectedId === sub.id ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-800"
                }`}
              >
                {subActive && subCtx && subCtx.percent > 0 && (
                  <ContextBar percent={subCtx.percent} tokensIn={subCtx.tokensIn} tokensOut={subCtx.tokensOut} costUsd={subCtx.costUsd} />
                )}
                <Cog size={11} className={`relative shrink-0 ${subActive ? "text-green-400 animate-pulse" : "text-gray-500"}`} />
                <span className="relative truncate text-xs font-medium">{sub.id}</span>
              </button>
              <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <AgentContextMenu agentName={sub.id} isOrchestrator={false} isFavorite={isAgentFavorite?.(sub.id)} onAction={onAgentAction} />
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}

function AgentRow({
  agent,
  selected,
  active,
  context,
  onSelect,
  onAgentAction,
  onToggleLink,
  linkAction,
  isAgentFavorite,
}: {
  agent: AgentFile;
  selected: boolean;
  active?: boolean;
  context?: AgentContext;
  onSelect: (a: AgentFile) => void;
  onAgentAction: (action: string, agentName: string) => void;
  onToggleLink?: (name: string) => void;
  linkAction?: "link" | "unlink";
  isAgentFavorite?: (name: string) => boolean;
}) {
  return (
    <div className="flex items-center group">
      <button
        onClick={() => onSelect(agent)}
        className={`relative flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-colors overflow-hidden ${
          selected ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-800"
        }`}
      >
        {active && context && context.percent > 0 && (
          <ContextBar percent={context.percent} tokensIn={context.tokensIn} tokensOut={context.tokensOut} costUsd={context.costUsd} />
        )}
        <span className={`relative w-2 h-2 rounded-full shrink-0 ${active ? "bg-green-400 animate-pulse" : (colorMap[agent.frontmatter.color || ""] || "bg-gray-500")}`} />
        <span className="relative truncate text-sm font-medium">{agent.id}</span>
      </button>
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <AgentContextMenu agentName={agent.id} isOrchestrator={agent.subAgents.length > 0} isFavorite={isAgentFavorite?.(agent.id)} onAction={onAgentAction} />
      </div>
      {onToggleLink && linkAction && (
        <button
          onClick={() => onToggleLink(agent.id)}
          className={`p-1.5 mr-1 rounded shrink-0 transition-colors ${
            linkAction === "link"
              ? "text-gray-600 hover:text-green-400 hover:bg-green-500/10"
              : "text-green-400/60 hover:text-red-400 hover:bg-red-500/10"
          }`}
        >
          {linkAction === "link" ? <Link size={12} /> : <Unlink size={12} />}
        </button>
      )}
    </div>
  );
}

function renderAgentList(
  agents: AgentFile[],
  allAgents: AgentFile[],
  selectedId: string | null,
  onSelect: (a: AgentFile) => void,
  onAgentAction: (action: string, agentName: string) => void,
  onToggleLink?: (name: string) => void,
  linkAction?: "link" | "unlink",
  isAgentFavorite?: (name: string) => boolean,
  activeAgents?: Set<string>,
  agentContexts?: Map<string, AgentContext>,
) {
  const agentIds = new Set(allAgents.map((a) => a.id));
  const subAgentIds = new Set<string>();
  for (const a of agents) {
    for (const sub of a.subAgents) {
      if (agentIds.has(sub)) subAgentIds.add(sub);
    }
  }

  const orchestrators = agents.filter((a) => a.subAgents.length > 0);
  const standalones = agents.filter((a) => a.subAgents.length === 0 && !subAgentIds.has(a.id));

  return (
    <div className="space-y-0.5">
      {orchestrators.map((orch) => (
        <OrchestratorTree
          key={orch.id}
          orchestrator={orch}
          allAgents={allAgents}
          selectedId={selectedId}
          onSelect={onSelect}
          onAgentAction={onAgentAction}
          onToggleLink={onToggleLink}
          linkAction={linkAction}
          isAgentFavorite={isAgentFavorite}
          activeAgents={activeAgents}
          agentContexts={agentContexts}
        />
      ))}
      {standalones.map((a) => (
        <AgentRow
          key={a.id}
          agent={a}
          selected={selectedId === a.id}
          active={activeAgents?.has(a.id)}
          context={agentContexts?.get(a.id)}
          onSelect={onSelect}
          onAgentAction={onAgentAction}
          onToggleLink={onToggleLink}
          linkAction={linkAction}
          isAgentFavorite={isAgentFavorite}
        />
      ))}
    </div>
  );
}

// ─── Skill row ───

function SkillRow({
  skill,
  selected,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: {
  skill: SkillFile;
  selected: boolean;
  isFavorite: boolean;
  onSelect: (s: SkillFile) => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="flex items-center group">
      <button
        onClick={() => onSelect(skill)}
        className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
          selected ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-800"
        }`}
      >
        <Wrench size={11} className="text-green-400 shrink-0" />
        <span className="truncate text-xs font-medium">{skill.name}</span>
      </button>
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <ItemContextMenu isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} />
      </div>
    </div>
  );
}

// ─── Hook row ───

function HookRow({
  hook,
  isFavorite,
  onToggleFavorite,
}: {
  hook: HookConfig;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="flex items-center group">
      <div className="flex-1 flex items-center gap-2 px-3 py-1.5 text-xs">
        <Settings size={10} className="text-yellow-400 shrink-0" />
        <span className="text-yellow-400 font-mono">{hook.event}</span>
        <span className="text-gray-600">→</span>
        <span className="text-gray-400 font-mono truncate">{hook.matcher}</span>
      </div>
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <ItemContextMenu isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} />
      </div>
    </div>
  );
}

// ─── Skill detail ───

function SkillDetail({ skill, isFavorite, onToggleFavorite }: { skill: SkillFile; isFavorite?: boolean; onToggleFavorite?: () => void }) {
  const [tab, setTab] = useState<SkillTab>("chat");

  const tabs: { key: SkillTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "chat", label: "Chat" },
    { key: "prompt", label: "Prompt" },
    { key: "files", label: `Files${skill.annexFiles.length > 0 ? ` (${skill.annexFiles.length})` : ""}` },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Wrench size={16} className="text-green-400" />
          <h2 className="text-lg font-bold text-white">{skill.name}</h2>
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className="p-1 rounded hover:bg-gray-800 transition-colors"
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star size={16} className={isFavorite ? "text-yellow-400 fill-yellow-400" : "text-gray-600 hover:text-yellow-400"} />
            </button>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            skill.scope === "user" ? "bg-yellow-500/15 text-yellow-400" : "bg-cyan-500/15 text-cyan-400"
          }`}>
            {skill.scope}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 border-b border-gray-800">
        <button
          onClick={() => setTab("chat")}
          className={`flex items-center gap-1.5 px-3 py-1.5 my-1.5 mr-2 text-xs font-medium rounded-lg transition-colors ${
            tab === "chat"
              ? "bg-cyan-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          <Terminal size={12} />
          Chat
        </button>
        <div className="w-px h-4 bg-gray-700 mr-1" />
        {tabs.filter((t) => t.key !== "chat").map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "chat" ? (
        <div className="flex-1 min-h-0 p-3">
          <AgentChat agentName={skill.name} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {tab === "overview" ? <SkillOverview skill={skill} /> : null}
          {tab === "prompt" ? <SkillPrompt skill={skill} /> : null}
          {tab === "files" ? <SkillFiles skill={skill} /> : null}
        </div>
      )}
    </div>
  );
}

function SkillOverview({ skill }: { skill: SkillFile }) {
  const meta = skill.metadata;
  const rows: [string, string][] = [
    ["Description", skill.description],
    ["Scope", skill.scope],
    ["Prompt size", `${skill.lineCount} lines`],
    ...(skill.license ? [["License", skill.license] as [string, string]] : []),
    ...(meta?.author ? [["Author", meta.author] as [string, string]] : []),
    ...(meta?.version ? [["Version", meta.version] as [string, string]] : []),
    ...(meta?.created ? [["Created", meta.created] as [string, string]] : []),
    ...(meta?.last_reviewed ? [["Last reviewed", meta.last_reviewed] as [string, string]] : []),
    ...(skill.annexFiles.length > 0 ? [["Annex files", String(skill.annexFiles.length)] as [string, string]] : []),
  ];

  return (
    <div className="space-y-4">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-gray-800/50">
              <td className="py-2 pr-4 text-gray-500 font-medium w-40">{label}</td>
              <td className="py-2 text-gray-300">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-xs text-gray-600 font-mono">{skill.filePath}</div>
    </div>
  );
}

function SkillPrompt({ skill }: { skill: SkillFile }) {
  return (
    <div className="bg-gray-800/30 rounded-lg p-6 overflow-x-auto">
      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
        {skill.body}
      </pre>
    </div>
  );
}

function SkillFiles({ skill }: { skill: SkillFile }) {
  if (skill.annexFiles.length === 0) {
    return <p className="text-sm text-gray-500">No additional files in this skill directory.</p>;
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="space-y-1">
      {skill.annexFiles.map((f) => (
        <div key={f.name} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800/30">
          <span className={`text-xs ${f.isDirectory ? "text-cyan-400" : "text-gray-400"}`}>
            {f.isDirectory ? "📁" : "📄"}
          </span>
          <span className="text-sm text-gray-300 font-mono flex-1">{f.name}</span>
          <span className="text-xs text-gray-600">{f.isDirectory ? "dir" : formatSize(f.size)}</span>
        </div>
      ))}
    </div>
  );
}

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
  const pendingTitles = useRef(new Map<string, string>());

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

  // Auto-rename chats with LLM-generated title after first exchange
  useEffect(() => {
    const cleanup = window.api.onEvent((data: any) => {
      if (data.type === "spawn_message" && data.message?.content) {
        const agent: string = data.agentName || "";
        const role: string = data.message.role;
        const content: string = data.message.content;

        if (role === "user") {
          // Check if there's a chat with a generic title
          setOpenChats((prev) => {
            const hasGeneric = prev.some(
              (c) =>
                (c.agentName === agent || c.agentName === "claude") &&
                (c.title === "New chat" || c.title.startsWith("Chat with "))
            );
            if (!hasGeneric || pendingTitles.current.has(agent)) return prev;

            pendingTitles.current.set(agent, content);

            // Show truncated preview immediately
            let preview = content.replace(/[\n\r]+/g, " ").trim();
            if (preview.length > 40) preview = preview.slice(0, 37) + "...";

            return prev.map((c) =>
              (c.agentName === agent || c.agentName === "claude") &&
              (c.title === "New chat" || c.title.startsWith("Chat with "))
                ? { ...c, title: preview }
                : c
            );
          });
        }

        if (role === "assistant" && pendingTitles.current.has(agent)) {
          const userMsg = pendingTitles.current.get(agent)!;
          pendingTitles.current.delete(agent);

          // Call LLM to generate a proper title
          window.api.generateTitle(userMsg, content).then((title) => {
            if (title) {
              setOpenChats((prev) =>
                prev.map((c) =>
                  c.agentName === agent || c.agentName === "claude"
                    ? { ...c, title }
                    : c
                )
              );
            }
          });
        }
      }
    });
    return cleanup;
  }, []);

  const togglePanel = (panel: string) => {
    setOpenPanels((prev) => {
      const next = new Set(prev);
      if (next.has(panel)) next.delete(panel);
      else next.add(panel);
      return next;
    });
  };

  const [sidebarWidth, setSidebarWidth] = useState(288);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = Math.min(Math.max(e.clientX, 200), 500);
      setSidebarWidth(newWidth);
    };
    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

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

        {/* Active Sessions */}
        {activeAgents.size > 0 && (
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center gap-2 mb-2 px-1">
              <span
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
              >
                Active
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
              >
                {activeAgents.size}
              </span>
            </div>
            <div className="space-y-0.5">
              {Array.from(activeAgents).map((agentName) => {
                const agent = agents.find((a) => a.frontmatter.name === agentName || a.id === agentName);
                const ctx = agentContexts.get(agentName);
                const isWaiting = waitingAgents?.has(agentName);
                const agentColor = agent?.frontmatter?.color;
                const colorHex: Record<string, string> = {
                  cyan: "#06b6d4", blue: "#3b82f6", green: "#22c55e",
                  yellow: "#eab308", orange: "#f97316", red: "#ef4444",
                  purple: "#a855f7", pink: "#ec4899",
                };
                const dotColor = colorHex[agentColor || ""] || "#06b6d4";

                return (
                  <button
                    key={agentName}
                    onClick={() => {
                      if (agent) { setSelectedAgent(agent); setSelectedSkill(null); setView("agent"); }
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Agent color dot — fast pulse */}
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: isWaiting ? '#eab308' : dotColor,
                        boxShadow: `0 0 6px ${isWaiting ? 'rgba(234,179,8,0.5)' : dotColor + '80'}`,
                        animation: isWaiting
                          ? 'pulse 0.6s ease-in-out infinite'
                          : 'pulse 1s ease-in-out infinite',
                      }}
                    />
                    {/* Agent name */}
                    <span
                      className="text-xs font-medium truncate"
                      style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
                    >
                      {agentName}
                    </span>
                    {/* Waiting badge */}
                    {isWaiting ? (
                      <span
                        className="text-[9px] px-1 py-0.5 rounded shrink-0"
                        style={{
                          background: 'rgba(234,179,8,0.15)',
                          color: '#eab308',
                          border: '1px solid rgba(234,179,8,0.2)',
                        }}
                      >
                        awaiting
                      </span>
                    ) : null}
                    {/* Context gauge */}
                    {ctx && ctx.percent > 0 && !isWaiting ? (
                      <div className="flex-1 flex items-center gap-1.5 ml-auto min-w-0">
                        <div
                          className="flex-1 h-[3px] rounded-full overflow-hidden"
                          style={{ background: 'var(--color-surface-0)', minWidth: '30px' }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${ctx.percent}%`,
                              background: ctx.percent >= 90 ? '#ef4444'
                                : ctx.percent >= 70 ? '#eab308'
                                : dotColor,
                            }}
                          />
                        </div>
                        <span
                          className="text-[9px] shrink-0"
                          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                        >
                          {Math.round(ctx.percent)}%
                        </span>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Open Chats */}
        {openChats.length > 0 && (
          <div className="px-3 pb-2" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <span
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
              >
                Chats
              </span>
            </div>
            <div className="space-y-0.5">
              {openChats.map((chat) => {
                const colorHex: Record<string, string> = {
                  cyan: "#06b6d4", blue: "#3b82f6", green: "#22c55e",
                  yellow: "#eab308", orange: "#f97316", red: "#ef4444",
                  purple: "#a855f7", pink: "#ec4899",
                };
                const agent = agents.find((a) => a.frontmatter.name === chat.agentName || a.id === chat.agentName);
                const dotColor = colorHex[agent?.frontmatter?.color || ""] || "#06b6d4";
                const isActive = activeAgents.has(chat.agentName);

                return (
                  <button
                    key={chat.id}
                    onClick={() => {
                      if (agent) {
                        setSelectedAgent(agent);
                        setSelectedSkill(null);
                        setView("agent");
                      }
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left"
                    style={{
                      background: 'transparent',
                      animation: chat.isNew ? 'chatSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <MessageSquare size={12} style={{ color: dotColor }} className="shrink-0" />
                    <span
                      className="text-xs truncate"
                      style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
                    >
                      {chat.title}
                    </span>
                    {isActive ? (
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0 ml-auto"
                        style={{
                          backgroundColor: dotColor,
                          animation: 'pulse 1s ease-in-out infinite',
                        }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
                    {renderAgentList(favAgents, agents, selectedAgent?.id ?? null, handleSelectAgent, handleAgentAction, undefined, undefined, (n) => isFavorite("agent", n), activeAgents, agentContexts)}
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
              renderAgentList(agents, agents, selectedAgent?.id ?? null, handleSelectAgent, handleAgentAction, undefined, undefined, (n) => isFavorite("agent", n), activeAgents, agentContexts)
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
                    renderAgentList(projectAgents, agents, selectedAgent?.id ?? null, handleSelectAgent, handleAgentAction, (name) => handleToggleLink(name, true), "unlink", (n) => isFavorite("agent", n), activeAgents, agentContexts)
                  ) : (
                    <div className="px-3 py-6 text-center">
                      <p className="text-xs text-gray-500 mb-1.5">No project agents</p>
                      <p className="text-[10px] text-gray-600 leading-relaxed">Link user agents or create agents in <code className="text-cyan-500/80 bg-cyan-500/8 px-1 py-0.5 rounded">.claude/agents/</code></p>
                    </div>
                  )
                ) : (
                  userAgents.length > 0 ? (
                    renderAgentList(userAgents, agents, selectedAgent?.id ?? null, handleSelectAgent, handleAgentAction, (name) => handleToggleLink(name, false), "link", (n) => isFavorite("agent", n), activeAgents, agentContexts)
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

        {/* Resize handle */}
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-cyan-500/30 transition-colors"
          onMouseDown={(e) => {
            e.preventDefault();
            isDragging.current = true;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
        />

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
