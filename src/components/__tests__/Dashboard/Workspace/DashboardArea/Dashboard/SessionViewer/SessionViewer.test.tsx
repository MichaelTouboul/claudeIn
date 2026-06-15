import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CONTEXT_WINDOW_TOKENS,
  HEAVY_CONTEXT_RATIO,
} from "@/components/Dashboard/Workspace/DashboardArea/Dashboard/SessionViewer/ResumeChoice/resumeRecommendation";
import { SessionViewer } from "@/components/Dashboard/Workspace/DashboardArea/Dashboard/SessionViewer/SessionViewer";
import type { SessionConversation, SessionMessage } from "@/hooks/useSessions";
import type { ChatMessage } from "@/lib/types";

// Stub the live-chat so the resume-entry test can assert which props the viewer
// hands AgentChat without mounting the full editor stack. AgentChat's own resume
// behaviour (claudeSessionId -> resume_session_id) is covered in its own test.
const agentChatProps = vi.fn();
vi.mock("@/components/Dashboard/AgentChat/AgentChat", () => ({
  AgentChat: (props: { resumeSessionId?: string; cwd?: string; initialMessages?: ChatMessage[] }) => {
    agentChatProps(props);
    return <div data-testid="agent-chat" />;
  },
}));

type AppendCb = (data: { filePath: string; messages: SessionMessage[] }) => void;

const FILE = "/sessions/abc.jsonl";

// A single message whose content estimate crosses the heavy threshold, so the
// viewer surfaces the Compact/Continue choice instead of auto-continuing.
const HEAVY_CHARS = CONTEXT_WINDOW_TOKENS * HEAVY_CONTEXT_RATIO * 4;

const { getSessionConversation, watchConversation, unwatchConversation, onConversationAppended, emitAppend } =
  vi.hoisted(() => {
    const listeners: AppendCb[] = [];
    return {
      getSessionConversation: vi.fn<(p: string) => Promise<SessionConversation | null>>(),
      watchConversation: vi.fn<(p: string) => Promise<void>>().mockResolvedValue(undefined),
      unwatchConversation: vi.fn<(p: string) => Promise<void>>().mockResolvedValue(undefined),
      onConversationAppended: vi.fn((cb: AppendCb) => {
        listeners.push(cb);
        return () => {
          const i = listeners.indexOf(cb);
          if (i >= 0) listeners.splice(i, 1);
        };
      }),
      emitAppend: (data: { filePath: string; messages: SessionMessage[] }) =>
        listeners.forEach((l) => l(data)),
    };
  });

function msg(uuid: string, role: "user" | "assistant", content: string): SessionMessage {
  return { uuid, role, content, timestamp: new Date().toISOString() };
}

function conversation(messages: SessionMessage[]): SessionConversation {
  return { sessionId: "abc", messages, totalTokensIn: 0, totalTokensOut: 0, model: null };
}

/** A conversation heavy enough that compaction is recommended (choice screen shown). */
function heavyConversation(extra: SessionMessage[] = []): SessionConversation {
  return conversation([msg("u1", "user", "x".repeat(HEAVY_CHARS)), ...extra]);
}

beforeEach(() => {
  Object.assign(window, {
    api: { getSessionConversation, watchConversation, unwatchConversation, onConversationAppended },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderViewer() {
  return render(
    <SessionViewer filePath={FILE} sessionId="abcdef12" title="My session" cwd="/Users/x/proj" />,
  );
}

describe("SessionViewer", () => {
  it("auto-continues a light conversation straight into the live chat (no choice screen)", async () => {
    getSessionConversation.mockResolvedValue(conversation([msg("u1", "user", "hello")]));
    renderViewer();

    expect(await screen.findByTestId("agent-chat")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue as is/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /compact/i })).not.toBeInTheDocument();
    // Continue mode (non-destructive): no compaction flag.
    expect(agentChatProps).toHaveBeenCalledWith(
      expect.objectContaining({ resumeSessionId: "abcdef12", cwd: "/Users/x/proj", compactOnResume: false }),
    );
    expect(watchConversation).toHaveBeenCalledWith(FILE);
  });

  it("renders the read-only transcript and starts the tail for a heavy conversation", async () => {
    getSessionConversation.mockResolvedValue(heavyConversation());
    renderViewer();

    expect(await screen.findByText("My session")).toBeInTheDocument();
    expect(watchConversation).toHaveBeenCalledWith(FILE);
  });

  it("appends live messages and dedupes by uuid (heavy conversation, viewer visible)", async () => {
    getSessionConversation.mockResolvedValue(heavyConversation());
    renderViewer();
    await screen.findByText("My session");

    emitAppend({ filePath: FILE, messages: [msg("a1", "assistant", "world")] });
    expect(await screen.findByText("world")).toBeInTheDocument();

    // Re-emitting the same uuid must not duplicate.
    emitAppend({ filePath: FILE, messages: [msg("a1", "assistant", "world")] });
    await waitFor(() => expect(screen.getAllByText("world")).toHaveLength(1));
  });

  it("ignores appends for a different filePath", async () => {
    getSessionConversation.mockResolvedValue(heavyConversation());
    renderViewer();
    await screen.findByText("My session");

    emitAppend({ filePath: "/sessions/other.jsonl", messages: [msg("x1", "assistant", "stray")] });
    await waitFor(() => expect(screen.queryByText("stray")).not.toBeInTheDocument());
  });

  it("shows the not-found state when the conversation is missing", async () => {
    getSessionConversation.mockResolvedValue(null);
    renderViewer();
    expect(await screen.findByText("Conversation not found on disk.")).toBeInTheDocument();
  });

  it("unwatches the conversation on unmount", async () => {
    getSessionConversation.mockResolvedValue(heavyConversation());
    const { unmount } = renderViewer();
    await screen.findByText("My session");
    unmount();
    expect(unwatchConversation).toHaveBeenCalledWith(FILE);
  });

  it("offers the resume choice with both Compact and Continue enabled (heavy conversation)", async () => {
    getSessionConversation.mockResolvedValue(heavyConversation());
    renderViewer();
    await screen.findByText("My session");

    expect(screen.getByRole("button", { name: /continue as is/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /compact/i })).toBeEnabled();
  });

  it('"Compact" resumes the same live chat as Continue, plus compactOnResume', async () => {
    getSessionConversation.mockResolvedValue(heavyConversation([msg("a1", "assistant", "world")]));
    renderViewer();
    await screen.findByText("My session");

    fireEvent.click(screen.getByRole("button", { name: /compact/i }));

    expect(await screen.findByTestId("agent-chat")).toBeInTheDocument();
    const props = agentChatProps.mock.calls[0][0] as {
      resumeSessionId?: string; cwd?: string; compactOnResume?: boolean; initialMessages?: ChatMessage[];
    };
    expect(props).toEqual(
      expect.objectContaining({ resumeSessionId: "abcdef12", cwd: "/Users/x/proj", compactOnResume: true }),
    );
  });

  it('"Continue as is" resumes into a live chat with the session id (heavy conversation)', async () => {
    getSessionConversation.mockResolvedValue(heavyConversation());
    renderViewer();
    await screen.findByText("My session");

    fireEvent.click(screen.getByRole("button", { name: /continue as is/i }));

    expect(await screen.findByTestId("agent-chat")).toBeInTheDocument();
    expect(agentChatProps).toHaveBeenCalledWith(
      expect.objectContaining({ resumeSessionId: "abcdef12", cwd: "/Users/x/proj", compactOnResume: false }),
    );
  });

  it("seeds the auto-continued live chat with the prior transcript history", async () => {
    getSessionConversation.mockResolvedValue(
      // Includes a tool-only row (empty content) that must be filtered out.
      conversation([
        msg("u1", "user", "hello"),
        msg("a1", "assistant", "world"),
        msg("t1", "assistant", "   "),
      ]),
    );
    renderViewer();
    await screen.findByTestId("agent-chat");

    const props = agentChatProps.mock.calls[0][0] as { initialMessages?: ChatMessage[] };
    expect(props.initialMessages).toEqual([
      expect.objectContaining({ id: "u1", role: "user", content: "hello" }),
      expect.objectContaining({ id: "a1", role: "assistant", content: "world" }),
    ]);
  });
});
