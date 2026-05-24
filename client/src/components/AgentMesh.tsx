import { useMemo, useCallback, useRef, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
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

type GraphNode = {
  id: string;
  agent: AgentFile;
  color: string;
  isOrchestrator: boolean;
  val: number;
};

type GraphLink = {
  source: string;
  target: string;
  color: string;
};

export default function AgentMesh({
  agents,
  activeAgents,
  onSelect,
}: {
  agents: AgentFile[];
  activeAgents: Set<string>;
  onSelect: (a: AgentFile) => void;
}) {
  const graphRef = useRef<any>(null);
  const animFrame = useRef(0);

  const agentIds = useMemo(() => new Set(agents.map((a) => a.id)), [agents]);

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = agents.map((a) => ({
      id: a.id,
      agent: a,
      color: colorValues[a.frontmatter.color || ""] || "#6b7280",
      isOrchestrator: a.subAgents.length > 0,
      val: a.subAgents.length > 0 ? 8 : 4,
    }));

    const links: GraphLink[] = [];
    for (const a of agents) {
      for (const sub of a.subAgents) {
        if (agentIds.has(sub)) {
          links.push({
            source: a.id,
            target: sub,
            color: colorValues[a.frontmatter.color || ""] || "#6b7280",
          });
        }
      }
    }

    return { nodes, links };
  }, [agents, agentIds]);

  useEffect(() => {
    let running = true;
    const tick = () => {
      animFrame.current += 0.02;
      if (graphRef.current) {
        graphRef.current.d3ReheatSimulation?.();
      }
      if (running) requestAnimationFrame(tick);
    };
    tick();
    return () => { running = false; };
  }, []);

  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D) => {
      const n = node as GraphNode;
      const x = node.x!;
      const y = node.y!;
      const r = n.isOrchestrator ? 18 : 12;
      const isActive = activeAgents.has(n.id);

      if (isActive) {
        const pulsePhase = (Math.sin(animFrame.current * 3) + 1) / 2;
        const haloR = r + 8 + pulsePhase * 6;
        const gradient = ctx.createRadialGradient(x, y, r, x, y, haloR);
        gradient.addColorStop(0, n.color + "60");
        gradient.addColorStop(1, n.color + "00");
        ctx.beginPath();
        ctx.arc(x, y, haloR, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#111827";
      ctx.fill();
      ctx.strokeStyle = isActive ? n.color : n.color + "80";
      ctx.lineWidth = isActive ? 2.5 : 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? n.color : n.color + "60";
      ctx.fill();

      ctx.font = `${n.isOrchestrator ? "bold " : ""}10px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = isActive ? "#f3f4f6" : "#9ca3af";
      ctx.fillText(n.id, x, y + r + 4);

      const model = n.agent.frontmatter.model || "inherit";
      ctx.font = "8px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#4b5563";
      ctx.fillText(model, x, y + r + 16);
    },
    [activeAgents]
  );

  const paintLink = useCallback(
    (link: any, ctx: CanvasRenderingContext2D) => {
      const src = link.source;
      const tgt = link.target;
      if (!src.x || !tgt.x) return;

      const srcActive = activeAgents.has(src.id);
      const tgtActive = activeAgents.has(tgt.id);
      const linkActive = srcActive || tgtActive;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = linkActive ? link.color + "80" : link.color + "25";
      ctx.lineWidth = linkActive ? 1.5 : 0.5;
      ctx.stroke();

      if (linkActive) {
        const t = (Math.sin(animFrame.current * 4) + 1) / 2;
        const px = src.x + (tgt.x - src.x) * t;
        const py = src.y + (tgt.y - src.y) * t;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = link.color;
        ctx.fill();
      }
    },
    [activeAgents]
  );

  const handleClick = useCallback(
    (node: any) => {
      const n = node as GraphNode;
      onSelect(n.agent);
    },
    [onSelect]
  );

  return (
    <div className="h-full w-full bg-gray-950">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeCanvasObject={paintNode}
        linkCanvasObject={paintLink}
        nodeRelSize={6}
        linkDirectionalParticles={0}
        onNodeClick={handleClick}
        backgroundColor="#030712"
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        cooldownTicks={100}
        enableNodeDrag={true}
      />
    </div>
  );
}
