import { useState } from "react";
import {
  Bot, Wrench, Settings, Hexagon, BarChart3, Globe, User,
  Link, Unlink, Network, Cog,
} from "lucide-react";
import type { AgentFile } from "../types/agent.types";
import type { SkillFile, HookConfig, Project } from "../hooks/useProjects";
import AgentDetail from "./AgentDetail";
import AgentMesh from "./AgentMesh";
import CostDashboard from "./CostDashboard";
import Accordion from "./Accordion";
import AgentContextMenu from "./AgentContextMenu";

type MainView = "agent" | "skill" | "hook" | "mesh" | "costs" | "none";

const colorMap: Record<string, string> = {
  cyan: "bg-cyan-500", blue: "bg-blue-500", green: "bg-green-500",
  yellow: "bg-yellow-500", orange: "bg-orange-500", red: "bg-red-500",
  purple: "bg-purple-500", pink: "bg-pink-500",
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
}: {
  orchestrator: AgentFile;
  allAgents: AgentFile[];
  selectedId: string | null;
  onSelect: (a: AgentFile) => void;
  onAgentAction: (action: string, agentName: string) => void;
  onToggleLink?: (name: string) => void;
  linkAction?: "link" | "unlink";
}) {
  const agentMap = new Map(allAgents.map((a) => [a.id, a]));
  const subs = orchestrator.subAgents
    .map((id) => agentMap.get(id))
    .filter((a): a is AgentFile => !!a);

  return (
    <div className="mb-1">
      <div className="flex items-center group">
        <button
          onClick={() => onSelect(orchestrator)}
          className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            selectedId === orchestrator.id ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-800"
          }`}
        >
          <Network size={14} className="text-cyan-400 shrink-0" />
          <span className="truncate text-sm font-medium">{orchestrator.id}</span>
          <span className="ml-auto text-xs text-gray-500">{orchestrator.frontmatter.model || "inherit"}</span>
        </button>
        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <AgentContextMenu agentName={orchestrator.id} isOrchestrator onAction={onAgentAction} />
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
          {subs.map((sub) => (
            <div key={sub.id} className="flex items-center group">
              <button
                onClick={() => onSelect(sub)}
                className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                  selectedId === sub.id ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-800"
                }`}
              >
                <Cog size={11} className="text-gray-500 shrink-0" />
                <span className="truncate text-xs font-medium">{sub.id}</span>
                <span className="ml-auto text-xs text-gray-600">{sub.frontmatter.model || "inherit"}</span>
              </button>
              <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <AgentContextMenu agentName={sub.id} isOrchestrator={false} onAction={onAgentAction} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgentRow({
  agent,
  selected,
  onSelect,
  onAgentAction,
  onToggleLink,
  linkAction,
}: {
  agent: AgentFile;
  selected: boolean;
  onSelect: (a: AgentFile) => void;
  onAgentAction: (action: string, agentName: string) => void;
  onToggleLink?: (name: string) => void;
  linkAction?: "link" | "unlink";
}) {
  const dot = colorMap[agent.frontmatter.color || ""] || "bg-gray-500";
  return (
    <div className="flex items-center group">
      <button
        onClick={() => onSelect(agent)}
        className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          selected ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-800"
        }`}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <span className="truncate text-sm font-medium">{agent.id}</span>
        <span className="ml-auto text-xs text-gray-500">{agent.frontmatter.model || "inherit"}</span>
      </button>
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <AgentContextMenu agentName={agent.id} isOrchestrator={agent.subAgents.length > 0} onAction={onAgentAction} />
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
        />
      ))}
      {standalones.map((a) => (
        <AgentRow
          key={a.id}
          agent={a}
          selected={selectedId === a.id}
          onSelect={onSelect}
          onAgentAction={onAgentAction}
          onToggleLink={onToggleLink}
          linkAction={linkAction}
        />
      ))}
    </div>
  );
}

// ─── Skill row ───

function SkillRow({
  skill,
  selected,
  onSelect,
}: {
  skill: SkillFile;
  selected: boolean;
  onSelect: (s: SkillFile) => void;
}) {
  return (
    <button
      onClick={() => onSelect(skill)}
      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
        selected ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-800"
      }`}
    >
      <Wrench size={11} className="text-green-400 shrink-0" />
      <span className="truncate text-xs font-medium">{skill.name}</span>
    </button>
  );
}

// ─── Hook row ───

function HookRow({ hook }: { hook: HookConfig }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs">
      <Settings size={10} className="text-yellow-400 shrink-0" />
      <span className="text-yellow-400 font-mono">{hook.event}</span>
      <span className="text-gray-600">→</span>
      <span className="text-gray-400 font-mono truncate">{hook.matcher}</span>
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

function SkillDetail({ skill }: { skill: SkillFile }) {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Wrench size={16} className="text-green-400" />
        <h2 className="text-lg font-bold text-white">{skill.name}</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          skill.scope === "user" ? "bg-yellow-500/15 text-yellow-400" : "bg-cyan-500/15 text-cyan-400"
        }`}>
          {skill.scope}
        </span>
      </div>
      <p className="text-sm text-gray-300 mb-4">{skill.description}</p>
      <div className="text-xs text-gray-600 font-mono">{skill.filePath}</div>
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
  onRefresh,
}: {
  project: Project;
  agents: AgentFile[];
  skills: SkillFile[];
  hooks: HookConfig[];
  activeAgents: Set<string>;
  onRefresh: () => void;
}) {
  const [view, setView] = useState<MainView>("none");
  const [selectedAgent, setSelectedAgent] = useState<AgentFile | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillFile | null>(null);
  const [openPanels, setOpenPanels] = useState<Set<string>>(() => new Set(["agents"]));

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

  const handleToggleLink = async (agentName: string, currentlyLinked: boolean) => {
    if (currentlyLinked) {
      await fetch(`/api/projects/${project.id}/links/${agentName}`, { method: "DELETE" });
    } else {
      await fetch(`/api/projects/${project.id}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_name: agentName }),
      });
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
          fetch(`/api/agents/${agentName}`, { method: "DELETE" }).then(() => onRefresh());
        }
        break;
      case "add-sub":
        // TODO: implement add sub-agent modal
        alert(`Add sub-agent to ${agentName} — coming soon`);
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
      <div className="w-72 border-r border-gray-800 bg-gray-900/30 flex flex-col h-full">

        {/* Open panels fill available space, closed panels stack at bottom */}
        {([
          {
            key: "agents",
            label: "Agents",
            icon: <Bot size={11} className="text-cyan-400" />,
            count: agents.length,
            content: isUserProject ? (
              renderAgentList(agents, agents, selectedAgent?.id ?? null, handleSelectAgent, handleAgentAction)
            ) : (
              <>
                {projectAgents.length > 0 && (
                  <>
                    <SectionLabel icon={<Globe size={10} className="text-cyan-400" />} label="Project" />
                    {renderAgentList(projectAgents, agents, selectedAgent?.id ?? null, handleSelectAgent, handleAgentAction, (name) => handleToggleLink(name, true), "unlink")}
                  </>
                )}
                {userAgents.length > 0 && (
                  <>
                    <SectionLabel icon={<User size={10} className="text-gray-500" />} label="User" />
                    <div className="opacity-60">
                      {renderAgentList(userAgents, agents, selectedAgent?.id ?? null, handleSelectAgent, handleAgentAction, (name) => handleToggleLink(name, false), "link")}
                    </div>
                  </>
                )}
              </>
            ),
          },
          (projectSkills.length > 0 || userSkills.length > 0) ? {
            key: "skills",
            label: "Skills",
            icon: <Wrench size={11} className="text-green-400" />,
            count: projectSkills.length + userSkills.length,
            content: isUserProject ? (
              skills.map((s) => (
                <SkillRow key={s.filePath} skill={s} selected={selectedSkill?.filePath === s.filePath} onSelect={handleSelectSkill} />
              ))
            ) : (
              <>
                {projectSkills.length > 0 && (
                  <>
                    <SectionLabel icon={<Globe size={10} className="text-cyan-400" />} label="Project" />
                    {projectSkills.map((s) => (
                      <SkillRow key={s.filePath} skill={s} selected={selectedSkill?.filePath === s.filePath} onSelect={handleSelectSkill} />
                    ))}
                  </>
                )}
                {userSkills.length > 0 && (
                  <>
                    <SectionLabel icon={<User size={10} className="text-gray-500" />} label="User" />
                    <div className="opacity-60">
                      {userSkills.map((s) => (
                        <SkillRow key={s.filePath} skill={s} selected={selectedSkill?.filePath === s.filePath} onSelect={handleSelectSkill} />
                      ))}
                    </div>
                  </>
                )}
              </>
            ),
          } : null,
          hooks.length > 0 ? {
            key: "hooks",
            label: "Hooks",
            icon: <Settings size={11} className="text-yellow-400" />,
            count: hooks.length,
            content: hooks.map((h, i) => <HookRow key={i} hook={h} />),
          } : null,
        ].filter(Boolean) as { key: string; label: string; icon: React.ReactNode; count: number; content: React.ReactNode }[])
          .sort((a, b) => {
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
              flex
            >
              {panel.content}
            </Accordion>
          ))
        }

      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-800 bg-gray-900/30">
          <button
            onClick={() => setView("mesh")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              view === "mesh" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
            }`}
          >
            <Hexagon size={13} />
            Mesh
          </button>
          <button
            onClick={() => setView("costs")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              view === "costs" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
            }`}
          >
            <BarChart3 size={13} />
            Costs
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {view === "agent" && selectedAgent ? (
            <AgentDetail agent={selectedAgent} onEdit={() => {}} onDelete={() => {}} onRefresh={onRefresh} />
          ) : view === "skill" && selectedSkill ? (
            <SkillDetail skill={selectedSkill} />
          ) : view === "mesh" ? (
            <AgentMesh agents={agents} activeAgents={activeAgents} onSelect={handleSelectAgent} />
          ) : view === "costs" ? (
            <CostDashboard />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              Select an item from the sidebar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
