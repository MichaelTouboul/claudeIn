import { GitBranch, History, Terminal } from "lucide-react";

import type { SessionSummary } from '@/hooks/useSessions';
import { useProject } from '@/store/ProjectContext';
import type { AgentFile } from '@/types/agent.types';

import type { MainView } from '../types';

export type LandingPageProps = {
  agents: AgentFile[];
  sessions: SessionSummary[];
  onSetView: (view: MainView) => void;
  onAddOpenChat: (agentName: string, title: string) => string;
  onStartChat: (agentName: string, sessionId: string, message: string) => void;
  onSelectAgent: (a: AgentFile) => void;
  onSelectSession: (s: SessionSummary) => void;
};

export function LandingPage({
  agents,
  sessions,
  onSetView,
  onAddOpenChat,
  onStartChat,
  onSelectAgent,
  onSelectSession,
}: LandingPageProps) {
  const { projectName, projectPath } = useProject();
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-10 space-y-8">

        {/* Header */}
        <div>
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {projectName}
          </h2>
          <p
            className="text-xs mt-1"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
          >
            {projectPath}
          </p>
        </div>

        {/* 1. New Chat */}
        <div>
          <button
            onClick={() => {
              onAddOpenChat("claude", "New chat");
              onStartChat("claude", "", "");
              onSetView("chat");
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
            style={{
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-surface-2)';
              e.currentTarget.style.borderColor = 'var(--color-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-surface-1)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(6,182,212,0.1)' }}
            >
              <Terminal size={16} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                New chat
              </p>
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                Start a fresh conversation with Claude
              </p>
            </div>
          </button>
        </div>

        {/* 2. Continue a session */}
        {sessions.length > 0 ? <div>
            <h3
              className="text-[11px] font-semibold uppercase tracking-widest mb-2 px-1"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              Recent sessions
            </h3>
            <div className="space-y-0.5">
              {sessions.slice(0, 5).map((s) => {
                const timeAgo = s.lastActiveAt
                  ? (() => {
                      const diff = Date.now() - new Date(s.lastActiveAt).getTime();
                      const mins = Math.floor(diff / 60000);
                      if (mins < 1) return "now";
                      if (mins < 60) return `${mins}m ago`;
                      const hours = Math.floor(mins / 60);
                      if (hours < 24) return `${hours}h ago`;
                      return `${Math.floor(hours / 24)}d ago`;
                    })()
                  : "";
                return (
                  <button
                    key={s.sessionId}
                    onClick={() => onSelectSession(s)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <History size={13} style={{ color: '#a855f7' }} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-medium truncate"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {s.title || s.firstPrompt || s.sessionId.slice(0, 8)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {s.agentName ? (
                          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {s.agentName}
                          </span>
                        ) : null}
                        {s.branch ? (
                          <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                            <GitBranch size={8} />{s.branch}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span
                      className="text-[10px] shrink-0"
                      style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                    >
                      {timeAgo}
                    </span>
                  </button>
                );
              })}
              {sessions.length > 5 ? <button
                  onClick={() => onSetView("session")}
                  className="w-full text-center py-1.5 text-[11px] rounded-lg transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                >
                  View all {sessions.length} sessions &rarr;
                </button> : null}
            </div>
          </div> : null}

        {/* 3. Chat with an agent */}
        {agents.length > 0 ? <div>
            <h3
              className="text-[11px] font-semibold uppercase tracking-widest mb-2 px-1"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              Agents
            </h3>
            <div className="space-y-0.5">
              {(() => {
                const colorHex: Record<string, string> = {
                  cyan: "#06b6d4", blue: "#3b82f6", green: "#22c55e",
                  yellow: "#eab308", orange: "#f97316", red: "#ef4444",
                  purple: "#a855f7", pink: "#ec4899",
                };
                // Orchestrators first (agents with subAgents), then others
                const sorted = [...agents].sort((a, b) => {
                  const aOrch = a.subAgents.length > 0 ? 0 : 1;
                  const bOrch = b.subAgents.length > 0 ? 0 : 1;
                  if (aOrch !== bOrch) return aOrch - bOrch;
                  return a.frontmatter.name.localeCompare(b.frontmatter.name);
                });
                return sorted.map((agent) => {
                  const color = colorHex[agent.frontmatter.color || ""] || "#6b7280";
                  const isOrch = agent.subAgents.length > 0;
                  return (
                    <button
                      key={agent.id}
                      onClick={() => {
                        onAddOpenChat(agent.frontmatter.name, `Chat with ${agent.frontmatter.name}`);
                        onSelectAgent(agent);
                        onSetView("agent");
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
                      style={{ background: 'transparent' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-medium truncate"
                            style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
                          >
                            {agent.frontmatter.name}
                          </span>
                          {isOrch ? (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded shrink-0"
                              style={{
                                background: 'rgba(6,182,212,0.1)',
                                color: 'var(--color-accent)',
                                border: '1px solid rgba(6,182,212,0.15)',
                              }}
                            >
                              orchestrator
                            </span>
                          ) : null}
                        </div>
                        {agent.frontmatter.description ? (
                          <p
                            className="text-[10px] truncate mt-0.5"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            {agent.frontmatter.description}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div> : null}
      </div>
    </div>
  );
}
