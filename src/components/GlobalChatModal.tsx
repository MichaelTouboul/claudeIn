import { useState } from "react";
import { X, Minus, MessageSquare } from "lucide-react";
import AgentChat from "./AgentChat";

export default function GlobalChatModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [minimized, setMinimized] = useState(false);
  const [title, setTitle] = useState("Claude Code");
  const [editingTitle, setEditingTitle] = useState(false);

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-gray-800 border border-gray-700/60 rounded-xl shadow-2xl shadow-black/40 hover:bg-gray-750 hover:border-gray-600 transition-all duration-200 group"
      >
        <MessageSquare size={14} className="text-cyan-400 group-hover:text-cyan-300" />
        <span className="text-sm font-medium text-white">{title}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-pulse" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-[720px] h-[82vh] bg-gray-900 border border-gray-700/50 rounded-2xl flex flex-col shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800/80 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <MessageSquare size={15} className="text-cyan-400" />
            {editingTitle ? (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
                className="bg-gray-800 border border-cyan-500/40 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/30 w-48"
                autoFocus
              />
            ) : (
              <span
                onDoubleClick={() => setEditingTitle(true)}
                className="text-sm font-bold text-white cursor-text hover:text-cyan-100 transition-colors"
                title="Double-click to rename"
              >
                {title}
              </span>
            )}
            <span className="text-[9px] font-semibold text-gray-500 bg-gray-800/80 px-1.5 py-0.5 rounded uppercase tracking-wider">
              global
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setMinimized(true)}
              className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Minimize"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 p-3">
          <AgentChat agentName="_main" />
        </div>
      </div>
    </div>
  );
}
