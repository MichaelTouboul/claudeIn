import { spawn, type ChildProcess } from "child_process";
import { randomUUID } from "crypto";
import { broadcast } from "./broadcast";
import { ingestEvent } from "./events.service";
import { extractText, parseStreamLine } from "./spawn.parse";
import { NO_FOLLOWUP_SYSTEM_PROMPT } from "./spawn.steering";
import { generateConversationTitle } from "./title.service";
import type { SpawnSession, ChatMessage, StreamEvent } from "../types/spawn.types";

const sessions = new Map<string, { session: SpawnSession; process: ChildProcess }>();

export function spawnAgent(agentName: string, mission: string, cwd?: string, resumeSessionId?: string): SpawnSession {
  const localSessionId = randomUUID();

  // `--append-system-prompt` is added here, ahead of the resume/fresh branch, so
  // the no-follow-up steering is re-passed on EVERY turn — including `--resume`,
  // where the CLI does not carry a prior turn's appended prompt forward.
  const args = [
    "--print",
    "--output-format", "stream-json",
    "--verbose",
    "--max-turns", "50",
    "--append-system-prompt", NO_FOLLOWUP_SYSTEM_PROMPT,
  ];

  if (resumeSessionId) {
    args.push("--resume", resumeSessionId);
  } else {
    const agentFlag = agentName && agentName !== "_main";
    if (agentFlag) {
      args.push("--agent", agentName);
    }
  }

  args.push(mission);

  const proc = spawn("claude", args, {
    stdio: ["pipe", "pipe", "pipe"],
    cwd: cwd || process.cwd(),
    env: { ...process.env, FORCE_COLOR: "0" },
  });

  const session: SpawnSession = {
    localSessionId,
    agentName,
    mission,
    status: "running",
    pid: proc.pid || null,
    startedAt: new Date().toISOString(),
    messages: [
      { role: "user", content: mission, timestamp: new Date().toISOString() },
    ],
    claudeSessionId: resumeSessionId,
    titleGenerated: Boolean(resumeSessionId),
  };

  let buffer = "";

  proc.stdout?.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = parseStreamLine(line);
      if (!event) continue;

      if (event.session_id && !session.claudeSessionId) {
        session.claudeSessionId = event.session_id;
        broadcast({
          type: "spawn_claude_session",
          localSessionId,
          claudeSessionId: event.session_id,
        });
      }

      handleStreamEvent(localSessionId, session, event);
    }
  });

  proc.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString().trim();
    if (text) {
      broadcast({
        type: "spawn_stderr",
        localSessionId,
        agentName,
        text,
      });
    }
  });

  proc.on("close", (code) => {
    session.status = code === 0 ? "done" : "failed";
    session.pid = null;

    broadcast({
      type: "spawn_exit",
      localSessionId,
      agentName,
      code,
      status: session.status,
      claudeSessionId: session.claudeSessionId,
    });

    try { ingestEvent({
      agent_name: agentName,
      session_id: localSessionId,
      event_type: "Stop",
      payload: { exit_code: code },
    }); } catch {}
  });

  sessions.set(localSessionId, { session, process: proc });

  try { ingestEvent({
    agent_name: agentName,
    session_id: localSessionId,
    event_type: "SubagentStart",
    payload: { mission },
  }); } catch {}

  broadcast({
    type: "spawn_start",
    localSessionId,
    agentName,
    mission,
  });

  broadcast({
    type: "spawn_message",
    localSessionId,
    agentName,
    message: { role: "user", content: mission, timestamp: new Date().toISOString() },
  });

  return session;
}

function handleStreamEvent(localSessionId: string, session: SpawnSession, event: StreamEvent) {
  const now = new Date().toISOString();

  if (event.type === "assistant") {
    const text = extractText(event);
    if (text) {
      const msg: ChatMessage = { role: "assistant", content: text, timestamp: now };
      session.messages.push(msg);
      broadcast({ type: "spawn_message", localSessionId, agentName: session.agentName, message: msg });

      // Best-effort, one-shot per conversation: when the first assistant reply
      // of a fresh conversation arrives, derive a short title in the backend and
      // broadcast it keyed by claudeSessionId. Resumed conversations are skipped
      // (titleGenerated seeded true). Errors are swallowed (no broadcast).
      if (!session.titleGenerated && session.claudeSessionId) {
        session.titleGenerated = true;
        const claudeSessionId = session.claudeSessionId;
        void generateConversationTitle(session.mission, text)
          .then((title) => {
            if (title && session.claudeSessionId) {
              broadcast({ type: "conversation_titled", localSessionId, claudeSessionId, title });
            }
          })
          .catch(() => {});
      }
    }
  }

  if (event.type === "tool_use") {
    const toolName = event.name || "unknown";
    const msg: ChatMessage = {
      role: "tool",
      content: JSON.stringify(event.input || {}, null, 2),
      toolName,
      timestamp: now,
    };
    session.messages.push(msg);
    broadcast({ type: "spawn_message", localSessionId, agentName: session.agentName, message: msg });

    try { ingestEvent({
      agent_name: session.agentName,
      session_id: localSessionId,
      event_type: "PreToolUse",
      tool_name: toolName,
    }); } catch {}
  }

  if (event.type === "tool_result") {
    try { ingestEvent({
      agent_name: session.agentName,
      session_id: localSessionId,
      event_type: "PostToolUse",
      tool_name: event.name || undefined,
    }); } catch {}
  }

  if (event.type === "result") {
    const text = extractText(event);
    if (text) {
      const msg: ChatMessage = { role: "assistant", content: text, timestamp: now };
      session.messages.push(msg);
      broadcast({ type: "spawn_message", localSessionId, agentName: session.agentName, message: msg });
    }
  }

  const usage = event.usage || event.message?.usage;
  if (usage) {
    const tokensIn = usage.input_tokens || 0;
    const tokensOut = usage.output_tokens || 0;

    broadcast({
      type: "spawn_usage",
      localSessionId,
      agentName: session.agentName,
      tokensIn,
      tokensOut,
      model: event.model || undefined,
    });

    try { ingestEvent({
      agent_name: session.agentName,
      session_id: localSessionId,
      event_type: "Usage",
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      model: event.model || event.message?.model || undefined,
    }); } catch {}
  }

  if (event.type === "input_request" || event.subtype === "input_request") {
    broadcast({
      type: "spawn_input_request",
      localSessionId,
      agentName: session.agentName,
    });
  }
}

export function sendInput(localSessionId: string, text: string): boolean {
  const entry = sessions.get(localSessionId);
  if (!entry || !entry.process.stdin?.writable) return false;

  entry.process.stdin.write(text + "\n");
  entry.session.messages.push({
    role: "user",
    content: text,
    timestamp: new Date().toISOString(),
  });

  broadcast({
    type: "spawn_message",
    localSessionId,
    agentName: entry.session.agentName,
    message: { role: "user", content: text, timestamp: new Date().toISOString() },
  });

  return true;
}

export function killSession(localSessionId: string): boolean {
  const entry = sessions.get(localSessionId);
  if (!entry) return false;

  entry.process.kill("SIGTERM");
  setTimeout(() => {
    if (entry.process.exitCode === null) {
      entry.process.kill("SIGKILL");
    }
  }, 5000);

  return true;
}

export function getSession(localSessionId: string): SpawnSession | null {
  return sessions.get(localSessionId)?.session || null;
}

export function getAllSessions(): SpawnSession[] {
  return Array.from(sessions.values()).map((e) => e.session);
}
