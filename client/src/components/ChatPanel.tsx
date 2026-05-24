import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Square,
  Loader2,
  Bot,
  User,
  Wrench,
  Play,
  X,
} from "lucide-react";
import type { AgentFile } from "../types/agent.types";
import type { SpawnSession, ChatMessage } from "../types/spawn.types";

const roleStyles: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  user: { bg: "bg-cyan-900/30 border-cyan-800/50", icon: <User size={14} />, label: "You" },
  assistant: { bg: "bg-gray-800/50 border-gray-700/50", icon: <Bot size={14} />, label: "Agent" },
  tool: { bg: "bg-yellow-900/20 border-yellow-800/30", icon: <Wrench size={14} />, label: "Tool" },
  system: { bg: "bg-gray-900/50 border-gray-800/50", icon: <Bot size={14} />, label: "System" },
};

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const style = roleStyles[msg.role] || roleStyles.system;
  const time = new Date(msg.timestamp).toLocaleTimeString("en-US", { hour12: false });

  return (
    <div className={`rounded-lg border px-4 py-3 ${style.bg}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-gray-400">{style.icon}</span>
        <span className="text-xs font-medium text-gray-400">{style.label}</span>
        {msg.toolName && (
          <span className="text-xs bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded">
            {msg.toolName}
          </span>
        )}
        <span className="text-xs text-gray-600 ml-auto">{time}</span>
      </div>
      <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
        {msg.content}
      </pre>
    </div>
  );
}

export default function ChatPanel({
  agents,
  onClose,
}: {
  agents: AgentFile[];
  onClose: () => void;
}) {
  const [session, setSession] = useState<SpawnSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedAgent, setSelectedAgent] = useState(agents[0]?.id || "");
  const [spawning, setSpawning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    const source = new EventSource("/api/events/stream");
    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "spawn_message" && session && data.sessionId === session.id) {
          setMessages((prev) => [...prev, data.message]);
        }
        if (data.type === "spawn_exit" && session && data.sessionId === session.id) {
          setSession((prev) => prev ? { ...prev, status: data.status } : null);
        }
      } catch {}
    };
    return () => source.close();
  }, [session?.id]);

  const handleSpawn = useCallback(async () => {
    if (!input.trim()) return;
    setSpawning(true);
    try {
      const res = await fetch("/api/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_name: selectedAgent, mission: input.trim() }),
      });
      const data: SpawnSession = await res.json();
      setSession(data);
      setMessages(data.messages || []);
      setInput("");
    } finally {
      setSpawning(false);
    }
  }, [input, selectedAgent]);

  const handleSend = useCallback(async () => {
    if (!session || !input.trim()) return;
    await fetch(`/api/spawn/${session.id}/input`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input.trim() }),
    });
    setInput("");
    inputRef.current?.focus();
  }, [session, input]);

  const handleKill = useCallback(async () => {
    if (!session) return;
    await fetch(`/api/spawn/${session.id}`, { method: "DELETE" });
  }, [session]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (session) handleSend();
      else handleSpawn();
    }
  };

  const isRunning = session?.status === "running";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-[900px] h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Bot size={18} className="text-cyan-400" />
            <span className="font-bold text-white text-sm">
              {session ? `Chat — ${session.agentName}` : "Start a Mission"}
            </span>
            {session && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isRunning
                    ? "bg-green-500/20 text-green-400 animate-pulse"
                    : session.status === "done"
                      ? "bg-gray-700 text-gray-400"
                      : "bg-red-500/20 text-red-400"
                }`}
              >
                {session.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isRunning && (
              <button
                onClick={handleKill}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded-lg"
              >
                <Square size={12} />
                Stop
              </button>
            )}
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
          {messages.length === 0 && !session && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Bot size={40} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Select an agent and describe your mission</p>
              </div>
            </div>
          )}
          {messages.length === 0 && session && (
            <div className="h-full flex items-center justify-center">
              <Loader2 size={24} className="text-cyan-400 animate-spin" />
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {isRunning && messages.length > 0 && messages[messages.length - 1].role !== "assistant" && (
            <div className="flex items-center gap-2 text-gray-500 text-xs px-4">
              <Loader2 size={12} className="animate-spin" />
              Agent thinking...
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-800 p-4">
          {!session && (
            <div className="flex gap-3 mb-3">
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:border-cyan-500 focus:outline-none"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id} ({a.frontmatter.model || "inherit"})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={session ? "Send a message..." : "Describe your mission..."}
              rows={2}
              className="flex-1 bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-4 py-2.5 resize-none focus:border-cyan-500 focus:outline-none font-mono"
            />
            <button
              onClick={session ? handleSend : handleSpawn}
              disabled={!input.trim() || spawning}
              className="px-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              {spawning ? (
                <Loader2 size={16} className="animate-spin" />
              ) : session ? (
                <Send size={16} />
              ) : (
                <>
                  <Play size={14} />
                  <span className="text-sm font-medium">Spawn</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
