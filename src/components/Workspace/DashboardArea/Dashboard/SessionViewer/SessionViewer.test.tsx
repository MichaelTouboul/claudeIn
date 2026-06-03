import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionConversation, SessionMessage } from "@/hooks/useSessions";

import { SessionViewer } from "./SessionViewer";

type AppendCb = (data: { filePath: string; messages: SessionMessage[] }) => void;

const FILE = "/sessions/abc.jsonl";

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

beforeEach(() => {
  Object.assign(window, {
    api: { getSessionConversation, watchConversation, unwatchConversation, onConversationAppended },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("SessionViewer", () => {
  it("renders the initial conversation read-only and starts the tail", async () => {
    getSessionConversation.mockResolvedValue(conversation([msg("u1", "user", "hello")]));
    render(<SessionViewer filePath={FILE} sessionId="abcdef12" title="My session" />);

    expect(await screen.findByText("hello")).toBeInTheDocument();
    expect(screen.getByText("My session")).toBeInTheDocument();
    expect(watchConversation).toHaveBeenCalledWith(FILE);
  });

  it("appends live messages and dedupes by uuid", async () => {
    getSessionConversation.mockResolvedValue(conversation([msg("u1", "user", "hello")]));
    render(<SessionViewer filePath={FILE} sessionId="abcdef12" title="My session" />);
    await screen.findByText("hello");

    emitAppend({ filePath: FILE, messages: [msg("a1", "assistant", "world")] });
    expect(await screen.findByText("world")).toBeInTheDocument();

    // Re-emitting the same uuid (plus the already-loaded one) must not duplicate.
    emitAppend({ filePath: FILE, messages: [msg("a1", "assistant", "world"), msg("u1", "user", "hello")] });
    await waitFor(() => expect(screen.getAllByText("world")).toHaveLength(1));
    expect(screen.getAllByText("hello")).toHaveLength(1);
  });

  it("ignores appends for a different filePath", async () => {
    getSessionConversation.mockResolvedValue(conversation([msg("u1", "user", "hello")]));
    render(<SessionViewer filePath={FILE} sessionId="abcdef12" title="My session" />);
    await screen.findByText("hello");

    emitAppend({ filePath: "/sessions/other.jsonl", messages: [msg("x1", "assistant", "stray")] });
    await waitFor(() => expect(screen.queryByText("stray")).not.toBeInTheDocument());
  });

  it("shows the not-found state when the conversation is missing", async () => {
    getSessionConversation.mockResolvedValue(null);
    render(<SessionViewer filePath={FILE} sessionId="abcdef12" title="My session" />);
    expect(await screen.findByText("Conversation not found on disk.")).toBeInTheDocument();
  });

  it("unwatches the conversation on unmount", async () => {
    getSessionConversation.mockResolvedValue(conversation([msg("u1", "user", "hello")]));
    const { unmount } = render(<SessionViewer filePath={FILE} sessionId="abcdef12" title="My session" />);
    await screen.findByText("hello");
    unmount();
    expect(unwatchConversation).toHaveBeenCalledWith(FILE);
  });
});
