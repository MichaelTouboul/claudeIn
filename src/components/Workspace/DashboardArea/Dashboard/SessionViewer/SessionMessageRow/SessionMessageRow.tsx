import { Bot, ChevronRight } from "lucide-react";

import { SlashCommandMessage } from "@/components/AgentChat/MessageRow/SlashCommandMessage/SlashCommandMessage";
import { decideUserContent } from "@/components/AgentChat/userContent";
import { ResponseBody } from "@/components/ResponseBody/ResponseBody";
import type { SessionMessage } from "@/hooks/useSessions";

export type SessionMessageRowProps = {
  msg: SessionMessage;
};

/**
 * Read-only render of an on-disk transcript message. Mirrors AgentChat's
 * MessageRow styling (user = accent / chevron, assistant = muted / bot) but with
 * no interactive ask-prompt handling — transcripts are not driven here.
 */
export function SessionMessageRow({ msg }: SessionMessageRowProps) {
  const isUser = msg.role === "user";
  const time = msg.timestamp
    ? new Date(msg.timestamp).toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";

  if (isUser) {
    const decision = decideUserContent(msg.content);
    // Pure plumbing / harness noise: hide the row entirely (no empty "you" header).
    if (decision.kind === "hidden") return null;
    return (
      <div className="group">
        <div className="flex items-center gap-2 mb-0.5">
          <ChevronRight size={12} style={{ color: "var(--color-accent)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--color-accent)" }}>
            you
          </span>
          {time ? (
            <span className="text-xs opacity-0 group-hover:opacity-100" style={{ color: "var(--color-text-muted)" }}>
              {time}
            </span>
          ) : null}
        </div>
        {decision.kind === "slash" ? (
          <SlashCommandMessage parsed={decision.message} />
        ) : (
          <pre
            className="text-sm whitespace-pre-wrap ml-5 leading-relaxed"
            style={{ color: "var(--color-accent)", fontFamily: "var(--font-mono)" }}
          >
            {decision.text}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className="group">
      <div className="flex items-center gap-2 mb-0.5">
        <Bot size={12} style={{ color: "var(--color-text-muted)" }} />
        <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          agent
        </span>
        {time ? (
          <span className="text-xs opacity-0 group-hover:opacity-100" style={{ color: "var(--color-text-muted)" }}>
            {time}
          </span>
        ) : null}
      </div>
      <div className="ml-5">
        <ResponseBody content={msg.content} />
      </div>
    </div>
  );
}
