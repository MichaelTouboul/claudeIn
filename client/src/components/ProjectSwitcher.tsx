import { FolderOpen, ChevronDown, Bot, Wrench, Settings } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { Project } from "../hooks/useProjects";

export default function ProjectSwitcher({
  projects,
  selected,
  onSelect,
}: {
  projects: Project[];
  selected: Project | null;
  onSelect: (p: Project) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
      >
        <FolderOpen size={14} className="text-cyan-400" />
        <span className="text-sm font-medium text-gray-200 max-w-[200px] truncate">
          {selected?.name || "Select project"}
        </span>
        <ChevronDown size={12} className="text-gray-500" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-700">
            <span className="text-xs text-gray-500 uppercase tracking-wider px-2">Projects</span>
          </div>
          <div className="max-h-80 overflow-y-auto p-1">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => { onSelect(p); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-3 transition-colors ${
                  selected?.id === p.id
                    ? "bg-cyan-600/20 text-white"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                <FolderOpen size={14} className={`mt-0.5 shrink-0 ${p.id === "user" ? "text-yellow-400" : "text-cyan-400"}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-gray-500 truncate">{p.path}</div>
                  <div className="flex gap-3 mt-1">
                    {p.agentCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Bot size={10} /> {p.agentCount}
                      </span>
                    )}
                    {p.skillCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Wrench size={10} /> {p.skillCount}
                      </span>
                    )}
                    {p.hasSettings && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Settings size={10} />
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
