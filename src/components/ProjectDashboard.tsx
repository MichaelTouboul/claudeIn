import { useState } from "react";
import {
  Bot, Wrench, Settings, BarChart3, Globe, User,
  Link, Unlink, Network, Cog, Star, Terminal, GitBranch, History,
} from "lucide-react";
import type { AgentFile } from "../types/agent.types";
import type { SkillFile, HookConfig, Project } from "../hooks/useProjects";
import { useFavorites } from "../hooks/useFavorites";
import { useSessions } from "../hooks/useSessions";
import AgentDetail from "./AgentDetail";
import AgentTree from "./AgentTree";
import CostDashboard from "./CostDashboard";
import SessionList from "./SessionList";
import SessionViewer from "./SessionViewer";
import Accordion from "./Accordion";
import AgentContextMenu from "./AgentContextMenu";
import ItemContextMenu from "./ItemContextMenu";
import AgentChat from "./AgentChat";

type MainView = "agent" | "skill" | "hook" | "tree" | "costs" | "session" | "none";

const colorMap: Record<string, string> = {
  cyan: "bg-cyan-500", blue: "bg-blue-500", green: "bg-green-500",
  yellow: "bg-yellow-500", orange: "bg-orange-500", red: "bg-red-500",
  purple: "bg-purple-500", pink: "bg-pink-500",
};

// ─── Context progress bar ───

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function progressColor(percent: number): string {
  if (percent >= 90) return "bg-red-500/20";
  if (percent >= 70) return "bg-yellow-500/20";
  return "bg-cyan-500/15";
}

function ContextBar({ percent, tokensIn, tokensOut, costUsd }: { percent: number; tokensIn: number; tokensOut: number; costUsd: number }) {
  return (
    <div
      className="absolute inset-0 rounded-lg pointer-events-none transition-all duration-500"
      title={`In: ${formatTokens(tokensIn)} · Out: ${formatTokens(tokensOut)} · $${costUsd.toFixed(4)} · ${percent.toFixed(0)}% context`}
    >
      <div
        className={`h-full rounded-lg transition-all duration-500 ${progressColor(percent)}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

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
  agentContexts?: Map<string, import("../hooks/useIPC").AgentContext>;
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
  context?: import("../hooks/useIPC").AgentContext;
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
  agentContexts?: Map<string, import("../hooks/useIPC").AgentContext>,
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

// ─── Section sub-header ───

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 mt-1 first:mt-0">
      {icon}
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ─── Skill detail ───

type SkillTab = "overview" | "chat" | "prompt" | "files";

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
          {tab === "overview" && <SkillOverview skill={skill} />}
          {tab === "prompt" && <SkillPrompt skill={skill} />}
          {tab === "files" && <SkillFiles skill={skill} />}
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

export default function ProjectDashboard({
  project,
  agents,
  skills,
  hooks,
  activeAgents,
  agentContexts,
  currentTools,
  onRefresh,
}: {
  project: Project;
  agents: AgentFile[];
  skills: SkillFile[];
  hooks: HookConfig[];
  activeAgents: Set<string>;
  agentContexts: Map<string, import("../hooks/useIPC").AgentContext>;
  currentTools?: Map<string, string>;
  onRefresh: () => void;
}) {
  const [view, setView] = useState<MainView>("none");
  const [selectedAgent, setSelectedAgent] = useState<AgentFile | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillFile | null>(null);
  const [openPanels, setOpenPanels] = useState<Set<string>>(() => new Set(["agents", "sessions"]));
  const [scopeTab, setScopeTab] = useState<"project" | "user">("project");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const { isFavorite, toggle: toggleFavorite } = useFavorites(project.id);
  const { sessions, loading: sessionsLoading, conversation, conversationLoading, selectSession } = useSessions(project.path);

  const togglePanel = (panel: string) => {
    setOpenPanels((prev) => {
      const next = new Set(prev);
      if (next.has(panel)) next.delete(panel);
      else next.add(panel);
      return next;
    });
  };

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

  return (
    <div className="flex-1 flex h-full">
      {/* Sidebar with accordions */}
      <div
        className="w-72 flex flex-col h-full"
        style={{
          background: 'var(--color-surface-1)',
          borderRight: '1px solid var(--color-border)',
        }}
      >

        {/* Open panels fill available space, closed panels stack at bottom */}
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
        ].filter(Boolean) as { key: string; label: string; icon: React.ReactNode; count: number; content: React.ReactNode }[])
          .sort((a, b) => {
            if (a.key === "favorites") return -1;
            if (b.key === "favorites") return 1;
            const aOpen = openPanels.has(a.key) ? 0 : 1;
            const bOpen = openPanels.has(b.key) ? 0 : 1;
            return aOpen - bOpen;
          })
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
            <AgentDetail agent={selectedAgent} onEdit={() => {}} onDelete={() => {}} onRefresh={onRefresh} onAgentUpdated={(a) => setSelectedAgent(a)} isFavorite={isFavorite("agent", selectedAgent.id)} onToggleFavorite={() => toggleFavorite("agent", selectedAgent.id)} />
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
            <SessionViewer conversation={conversation} loading={conversationLoading} />
          ) : view === "costs" ? (
            <CostDashboard />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                <Bot size={18} style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <div className="text-center">
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500 }}>
                  No item selected
                </p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '11px', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  Select an agent, skill, or session from the sidebar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
