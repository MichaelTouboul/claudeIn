import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { AgentFile } from "../types/agent.types";

const colorValues: Record<string, string> = {
  cyan: "#06b6d4",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  orange: "#f97316",
  red: "#ef4444",
  purple: "#a855f7",
  pink: "#ec4899",
};

function AgentNode({ data }: { data: { agent: AgentFile; onSelect: (a: AgentFile) => void } }) {
  const { agent, onSelect } = data;
  const color = colorValues[agent.frontmatter.color || ""] || "#6b7280";
  const model = agent.frontmatter.model || "inherit";

  return (
    <div
      onClick={() => onSelect(agent)}
      className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 cursor-pointer hover:border-gray-500 transition-colors min-w-[180px]"
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-600" />
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-bold text-white">{agent.id}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">{model}</span>
        {agent.frontmatter.memory && (
          <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
            memory
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-600" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  agent: AgentNode,
};

export default function AgentGraph({
  agents,
  onSelect,
}: {
  agents: AgentFile[];
  onSelect: (a: AgentFile) => void;
}) {
  const agentIds = useMemo(() => new Set(agents.map((a) => a.id)), [agents]);

  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, { x: number; y: number }>();
    const edgeList: Edge[] = [];

    const workerIds = new Set<string>();
    const orchestrators = agents.filter((a) => a.subAgents.length > 0);
    for (const orch of orchestrators) {
      for (const sub of orch.subAgents) {
        if (agentIds.has(sub)) workerIds.add(sub);
      }
    }
    const standalone = agents.filter(
      (a) => !orchestrators.includes(a) && !workerIds.has(a.id)
    );

    let xOffset = 0;
    for (const orch of orchestrators) {
      const subs = orch.subAgents.filter((s) => agentIds.has(s));
      const groupWidth = Math.max(subs.length, 1) * 220;
      const orchX = xOffset + groupWidth / 2;

      nodeMap.set(orch.id, { x: orchX, y: 50 });

      subs.forEach((subId, i) => {
        if (!nodeMap.has(subId)) {
          nodeMap.set(subId, { x: xOffset + i * 220 + 110, y: 280 });
        }
        edgeList.push({
          id: `${orch.id}-${subId}`,
          source: orch.id,
          target: subId,
          animated: true,
          style: { stroke: colorValues[orch.frontmatter.color || ""] || "#6b7280" },
        });
      });

      xOffset += groupWidth + 80;
    }

    standalone.forEach((a, i) => {
      if (!nodeMap.has(a.id)) {
        nodeMap.set(a.id, { x: xOffset + i * 220, y: 150 });
      }
    });

    const nodeList: Node[] = agents
      .filter((a) => nodeMap.has(a.id))
      .map((a) => ({
        id: a.id,
        type: "agent",
        position: nodeMap.get(a.id)!,
        data: { agent: a, onSelect },
      }));

    return { nodes: nodeList, edges: edgeList };
  }, [agents, agentIds, onSelect]);

  return (
    <div className="h-full w-full bg-gray-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1f2937" gap={20} />
        <Controls className="!bg-gray-800 !border-gray-700 !rounded-lg [&>button]:!bg-gray-800 [&>button]:!border-gray-700 [&>button]:!text-gray-400" />
      </ReactFlow>
    </div>
  );
}
