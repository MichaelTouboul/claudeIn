import { useMemo } from "react";
import { Bot, FolderTree, Plus, RefreshCw } from "lucide-react";
import type { AgentFile } from "../types/agent.types";

type FolderNode = {
  name: string;
  agents: AgentFile[];
  children: Record<string, FolderNode>;
};

function buildTree(agents: AgentFile[]): FolderNode {
  const root: FolderNode = { name: "", agents: [], children: {} };

  for (const agent of agents) {
    const parts = agent.folder ? agent.folder.split("/") : [];
    let current = root;
    for (const part of parts) {
      if (!current.children[part]) {
        current.children[part] = { name: part, agents: [], children: {} };
      }
      current = current.children[part];
    }
    current.agents.push(agent);
  }

  return root;
}

const colorMap: Record<string, string> = {
  cyan: "bg-cyan-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
};

function AgentItem({
  agent,
  selected,
  active,
  onSelect,
}: {
  agent: AgentFile;
  selected: boolean;
  active: boolean;
  onSelect: (a: AgentFile) => void;
}) {
  const dot = colorMap[agent.frontmatter.color || ""] || "bg-gray-500";
  return (
    <button
      onClick={() => onSelect(agent)}
      className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
        selected
          ? "bg-gray-700 text-white"
          : "text-gray-300 hover:bg-gray-800 hover:text-white"
      }`}
    >
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot} ${active ? "animate-pulse ring-2 ring-offset-1 ring-offset-gray-900 ring-current" : ""}`} />
      <span className="truncate text-sm font-medium">{agent.id}</span>
      <span className="ml-auto text-xs text-gray-500">{agent.frontmatter.model || "inherit"}</span>
    </button>
  );
}

function FolderView({
  node,
  selectedId,
  activeAgents,
  onSelect,
  depth,
}: {
  node: FolderNode;
  selectedId: string | null;
  activeAgents: Set<string>;
  onSelect: (a: AgentFile) => void;
  depth: number;
}) {
  return (
    <div className={depth > 0 ? "ml-3 border-l border-gray-800 pl-2" : ""}>
      {node.name && (
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <FolderTree size={12} />
          {node.name}
        </div>
      )}
      {node.agents.map((a) => (
        <AgentItem key={a.id} agent={a} selected={selectedId === a.id} active={activeAgents.has(a.id)} onSelect={onSelect} />
      ))}
      {Object.values(node.children).map((child) => (
        <FolderView
          key={child.name}
          node={child}
          selectedId={selectedId}
          activeAgents={activeAgents}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default function Sidebar({
  agents,
  activeAgents,
  selectedId,
  onSelect,
  onRefresh,
  onCreate,
}: {
  agents: AgentFile[];
  activeAgents: Set<string>;
  selectedId: string | null;
  onSelect: (a: AgentFile) => void;
  onRefresh: () => void;
  onCreate: () => void;
}) {
  const tree = useMemo(() => buildTree(agents), [agents]);

  return (
    <aside className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <Bot size={20} className="text-cyan-400" />
          <h1 className="text-sm font-bold text-white tracking-wide">Agent Manager</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCreate}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Plus size={14} />
            New Agent
          </button>
          <button
            onClick={onRefresh}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <FolderView node={tree} selectedId={selectedId} activeAgents={activeAgents} onSelect={onSelect} depth={0} />
      </div>
      <div className="p-3 border-t border-gray-800 text-xs text-gray-600">
        {agents.length} agents
      </div>
    </aside>
  );
}
