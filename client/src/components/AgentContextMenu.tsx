import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Edit3, Trash2, Plus, Type, Star, StarOff } from "lucide-react";

type Action = "rename" | "edit" | "delete" | "add-sub" | "toggle-favorite";

export default function AgentContextMenu({
  agentName,
  isOrchestrator,
  isFavorite,
  onAction,
}: {
  agentName: string;
  isOrchestrator: boolean;
  isFavorite?: boolean;
  onAction: (action: Action, agentName: string) => void;
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

  const items: { action: Action; label: string; icon: React.ReactNode; color?: string }[] = [
    isFavorite
      ? { action: "toggle-favorite", label: "Remove favorite", icon: <StarOff size={12} />, color: "text-yellow-400" }
      : { action: "toggle-favorite", label: "Add to favorites", icon: <Star size={12} />, color: "text-yellow-400" },
    { action: "add-sub", label: "Add sub-agent", icon: <Plus size={12} />, color: "text-cyan-400" },
    { action: "rename", label: "Rename", icon: <Type size={12} /> },
    { action: "edit", label: "Edit", icon: <Edit3 size={12} /> },
    { action: "delete", label: "Delete", icon: <Trash2 size={12} />, color: "text-red-400" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1 rounded text-gray-600 hover:text-gray-300 hover:bg-gray-700 transition-colors"
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 py-1 overflow-hidden">
          {items.map((item) => (
            <button
              key={item.action}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onAction(item.action, agentName);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-gray-700 ${
                item.color || "text-gray-300"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
