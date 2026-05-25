import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Send,
  Square,
  Loader2,
  Bot,
  Wrench,
  Play,
  Terminal,
  ChevronRight,
  Shield,
} from "lucide-react";
import type { SpawnSession, ChatMessage } from "../types/spawn.types";

const SLASH_COMMANDS = [
  { cmd: "/help", desc: "Get help with Claude Code" },
  { cmd: "/init", desc: "Initialize CLAUDE.md" },
  { cmd: "/review", desc: "Review a pull request" },
  { cmd: "/compact", desc: "Compact conversation context" },
  { cmd: "/clear", desc: "Clear conversation history" },
  { cmd: "/config", desc: "Open settings" },
  { cmd: "/cost", desc: "Show token/cost usage" },
  { cmd: "/doctor", desc: "Check Claude Code health" },
  { cmd: "/login", desc: "Switch account" },
  { cmd: "/logout", desc: "Sign out" },
  { cmd: "/memory", desc: "Edit CLAUDE.md" },
  { cmd: "/model", desc: "Switch model" },
  { cmd: "/permissions", desc: "View allowed tools" },
  { cmd: "/status", desc: "Show session status" },
  { cmd: "/terminal-setup", desc: "Install shell integration" },
  { cmd: "/vim", desc: "Toggle vim mode" },
];

type QuickReply = { label: string; value: string; variant: "accept" | "deny" | "neutral" };

const PERMISSION_PATTERNS = [
  /\b(approu|authoriz|permission|autoris|y\/n|oui.*non|yes.*no|allow|approve)\b/i,
  /\bconfirm/i,
  /\bon y va\b/i,
  /\bpeux-tu\b/i,
  /\bdo you want\b/i,
  /\bshould I\b/i,
  /\bwould you like\b/i,
  /\bvoulez-vous\b/i,
  /\bveux-tu\b/i,
];

const QUESTION_PATTERNS = [
  /\?\s*$/m,
  /\bchoix\b/i,
  /\bchoose\b/i,
  /\bwhich\b.*\?/i,
  /\bquel\b/i,
];

function detectQuickReplies(content: string): QuickReply[] | null {
  const isPermission = PERMISSION_PATTERNS.some((p) => p.test(content));
  if (isPermission) {
    return [
      { label: "Yes", value: "yes", variant: "accept" },
      { label: "Yes, always", value: "yes, always allow this", variant: "accept" },
      { label: "No", value: "no", variant: "deny" },
    ];
  }

  const isQuestion = QUESTION_PATTERNS.some((p) => p.test(content));
  if (isQuestion) {
    return [
      { label: "Yes", value: "yes", variant: "accept" },
      { label: "No", value: "no", variant: "deny" },
    ];
  }

  return null;
}

const replyStyles: Record<string, string> = {
  accept: "bg-green-600/20 text-green-400 border-green-500/30 hover:bg-green-600/30",
  deny: "bg-red-600/20 text-red-400 border-red-500/30 hover:bg-red-600/30",
  neutral: "bg-gray-700/50 text-gray-300 border-gray-600/30 hover:bg-gray-700",
};

function MessageRow({ msg, isLast, quickReplies, onQuickReply }: {
  msg: ChatMessage;
  isLast: boolean;
  quickReplies: QuickReply[] | null;
  onQuickReply: (value: string) => void;
}) {
  const isUser = msg.role === "user";
  const isTool = msg.role === "tool";
  const time = new Date(msg.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  if (isUser) {
    return (
      <div className="group">
        <div className="flex items-center gap-2 mb-0.5">
          <ChevronRight size={12} className="text-cyan-400" />
          <span className="text-xs text-cyan-400 font-medium">you</span>
          <span className="text-xs text-gray-600 opacity-0 group-hover:opacity-100">{time}</span>
        </div>
        <pre className="text-sm text-cyan-300 whitespace-pre-wrap font-mono ml-5 leading-relaxed">{msg.content}</pre>
      </div>
    );
  }

  if (isTool) {
    return (
      <div className="group ml-5">
        <div className="flex items-center gap-2 mb-0.5">
          <Wrench size={10} className="text-yellow-500" />
          <span className="text-xs text-yellow-500 font-mono">{msg.toolName || "tool"}</span>
          <span className="text-xs text-gray-600 opacity-0 group-hover:opacity-100">{time}</span>
        </div>
        <pre className="text-xs text-gray-500 whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">{msg.content}</pre>
      </div>
    );
  }

  const hasPermission = isLast && quickReplies && PERMISSION_PATTERNS.some((p) => p.test(msg.content));

  return (
    <div className="group">
      <div className="flex items-center gap-2 mb-0.5">
        {hasPermission ? (
          <Shield size={12} className="text-yellow-400" />
        ) : (
          <Bot size={12} className="text-gray-400" />
        )}
        <span className={`text-xs font-medium ${hasPermission ? "text-yellow-400" : "text-gray-400"}`}>
          {hasPermission ? "authorization" : "agent"}
        </span>
        <span className="text-xs text-gray-600 opacity-0 group-hover:opacity-100">{time}</span>
      </div>
      <pre className={`text-sm whitespace-pre-wrap font-mono ml-5 leading-relaxed ${hasPermission ? "text-yellow-200/80" : "text-gray-200"}`}>
        {msg.content}
      </pre>
      {isLast && quickReplies && (
        <div className="flex flex-wrap gap-2 ml-5 mt-2">
          {quickReplies.map((r) => (
            <button
              key={r.value}
              onClick={() => onQuickReply(r.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${replyStyles[r.variant]}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AgentChat({
  agentName,
}: {
  agentName: string;
}) {
  const [session, setSession] = useState<SpawnSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [spawning, setSpawning] = useState(false);
  const [showSlash, setShowSlash] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);
  const [waitingInput, setWaitingInput] = useState(false);
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
          setWaitingInput(false);
        }
        if (data.type === "spawn_input_request" && session && data.sessionId === session.id) {
          setWaitingInput(true);
        }
        if (data.type === "spawn_exit" && session && data.sessionId === session.id) {
          setSession((prev) => prev ? { ...prev, status: data.status } : null);
          setWaitingInput(false);
        }
      } catch {}
    };
    return () => source.close();
  }, [session?.id]);

  const lastAssistantMsg = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i];
    }
    return null;
  }, [messages]);

  const quickReplies = useMemo(() => {
    if (!lastAssistantMsg || !isRunning) return null;
    if (messages.length > 0 && messages[messages.length - 1].role === "user") return null;
    return detectQuickReplies(lastAssistantMsg.content);
  }, [lastAssistantMsg, messages]);

  const isRunning = session?.status === "running";

  const filteredCommands = SLASH_COMMANDS.filter((c) =>
    c.cmd.toLowerCase().includes(slashFilter.toLowerCase())
  );

  const handleInputChange = (val: string) => {
    setInput(val);
    if (val.startsWith("/")) {
      setShowSlash(true);
      setSlashFilter(val);
      setSlashIndex(0);
    } else {
      setShowSlash(false);
    }
  };

  const handleSelectSlash = (cmd: string) => {
    setInput(cmd + " ");
    setShowSlash(false);
    inputRef.current?.focus();
  };

  const handleSpawn = useCallback(async () => {
    if (!input.trim()) return;
    setSpawning(true);
    try {
      const res = await fetch("/api/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_name: agentName, mission: input.trim() }),
      });
      const data: SpawnSession = await res.json();
      setSession(data);
      setMessages(data.messages || []);
      setInput("");
      setShowSlash(false);
    } finally {
      setSpawning(false);
    }
  }, [input, agentName]);

  const handleSend = useCallback(async () => {
    if (!session || !input.trim()) return;
    await fetch(`/api/spawn/${session.id}/input`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input.trim() }),
    });
    setInput("");
    setShowSlash(false);
    setWaitingInput(false);
    inputRef.current?.focus();
  }, [session, input]);

  const handleQuickReply = useCallback(async (value: string) => {
    if (!session) return;
    await fetch(`/api/spawn/${session.id}/input`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: value }),
    });
    setWaitingInput(false);
  }, [session]);

  const handleKill = useCallback(async () => {
    if (!session) return;
    await fetch(`/api/spawn/${session.id}`, { method: "DELETE" });
  }, [session]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSlash && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        handleSelectSlash(filteredCommands[slashIndex].cmd);
        return;
      }
      if (e.key === "Escape") {
        setShowSlash(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (session && isRunning) handleSend();
      else handleSpawn();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 rounded-lg border border-gray-800">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-cyan-400" />
          <span className="text-xs font-medium text-gray-300">
            {session ? `${agentName} — session` : agentName}
          </span>
          {session && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
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
          {waitingInput && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-yellow-500/20 text-yellow-400 animate-pulse">
              awaiting response
            </span>
          )}
        </div>
        {isRunning && (
          <button
            onClick={handleKill}
            className="flex items-center gap-1 px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/10 rounded"
          >
            <Square size={10} />
            Stop
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 font-mono">
        {messages.length === 0 && !session && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Terminal size={32} className="text-gray-800 mx-auto mb-2" />
              <p className="text-gray-600 text-xs">Type a prompt to start a session with <span className="text-cyan-500">{agentName}</span></p>
              <p className="text-gray-700 text-xs mt-1">Type <span className="text-yellow-500">/</span> for commands</p>
            </div>
          </div>
        )}
        {messages.length === 0 && session && (
          <div className="h-full flex items-center justify-center">
            <Loader2 size={20} className="text-cyan-400 animate-spin" />
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageRow
            key={i}
            msg={msg}
            isLast={i === messages.length - 1 || (msg.role === "assistant" && i === messages.length - 1)}
            quickReplies={i === messages.length - 1 && msg.role === "assistant" ? quickReplies : null}
            onQuickReply={handleQuickReply}
          />
        ))}
        {isRunning && !waitingInput && messages.length > 0 && messages[messages.length - 1].role !== "assistant" && (
          <div className="flex items-center gap-2 text-gray-600 text-xs ml-5">
            <Loader2 size={10} className="animate-spin" />
            thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div className={`relative border-t p-3 ${waitingInput ? "border-yellow-500/50 bg-yellow-500/5" : "border-gray-800"}`}>
        {/* Slash command popup */}
        {showSlash && filteredCommands.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto py-1">
            {filteredCommands.map((cmd, i) => (
              <button
                key={cmd.cmd}
                onClick={() => handleSelectSlash(cmd.cmd)}
                className={`w-full flex items-center gap-3 px-3 py-1.5 text-xs transition-colors ${
                  i === slashIndex ? "bg-cyan-500/20 text-cyan-300" : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                <span className="font-mono text-yellow-400 w-28 text-left">{cmd.cmd}</span>
                <span className="text-gray-500">{cmd.desc}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <div className={`flex items-center text-sm shrink-0 pt-1.5 ${waitingInput ? "text-yellow-400" : "text-cyan-500"}`}>
            <ChevronRight size={14} />
          </div>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={waitingInput ? "Type your response (yes / no / ...)..." : session && isRunning ? "Send a message..." : "Type a prompt or / for commands..."}
            rows={1}
            className="flex-1 bg-transparent text-gray-200 text-sm resize-none focus:outline-none font-mono placeholder-gray-700 leading-relaxed"
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={session && isRunning ? handleSend : handleSpawn}
            disabled={!input.trim() || spawning}
            className="p-1.5 text-cyan-400 hover:text-cyan-300 disabled:text-gray-700 transition-colors shrink-0"
          >
            {spawning ? (
              <Loader2 size={16} className="animate-spin" />
            ) : session && isRunning ? (
              <Send size={16} />
            ) : (
              <Play size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
