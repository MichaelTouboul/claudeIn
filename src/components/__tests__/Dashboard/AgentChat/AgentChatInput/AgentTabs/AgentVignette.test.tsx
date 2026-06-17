import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AgentVignette } from "@/components/Dashboard/AgentChat/AgentChatInput/AgentTabs/AgentVignette";
import type { ConversationAgent } from "@/hooks/useConversationAgents";
import { ConversationAgentStatus } from "@/hooks/useConversationAgents";

function agent(over: Partial<ConversationAgent> = {}): ConversationAgent {
  return {
    name: "slack-assistant",
    color: "green",
    status: ConversationAgentStatus.Active,
    latestSeq: 1,
    ...over,
  };
}

describe("AgentVignette", () => {
  it("renders the agent name and the hue identity class", () => {
    const { container } = render(
      <AgentVignette agent={agent({ color: "purple" })} onOpen={() => {}} onDismiss={() => {}} />,
    );

    expect(screen.getByText("slack-assistant")).toBeInTheDocument();
    expect(container.querySelector(".agent-color-purple")).not.toBeNull();
  });

  it("shows a pulsing live dot only for an active agent", () => {
    const { rerender } = render(
      <AgentVignette
        agent={agent({ name: "live", status: ConversationAgentStatus.Active })}
        onOpen={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByTestId("agent-vignette-dot-live").className).toContain("animate-pulse");

    rerender(
      <AgentVignette
        agent={agent({ name: "live", status: ConversationAgentStatus.Idle })}
        onOpen={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(screen.queryByTestId("agent-vignette-dot-live")).toBeNull();
  });

  it("calls onOpen on the body click and onDismiss on the × click", () => {
    const onOpen = vi.fn();
    const onDismiss = vi.fn();
    render(<AgentVignette agent={agent()} onOpen={onOpen} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByText("slack-assistant"));
    expect(onOpen).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("agent-vignette-dismiss-slack-assistant"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    // Dismiss must not trigger the open handler.
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
