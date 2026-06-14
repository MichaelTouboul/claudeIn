import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { McpRawConfig } from "@/components/CustomizePage/Connectors/McpRawConfig";
import type { McpServerRaw } from "@/types/mcp-manage.types";

function stdioRaw(overrides: Partial<McpServerRaw> = {}): McpServerRaw {
  return {
    name: "context7",
    transport: "stdio",
    scope: "project",
    command: "npx",
    args: ["-y", "@context7/mcp"],
    env: { API_KEY: "x" },
    ...overrides,
  };
}

function httpRaw(overrides: Partial<McpServerRaw> = {}): McpServerRaw {
  return {
    name: "gh",
    transport: "http",
    scope: "user",
    url: "https://api.example/mcp",
    headers: { Authorization: "Bearer t" },
    ...overrides,
  };
}

describe("McpRawConfig", () => {
  it("renders command, args and env for a stdio server", () => {
    render(<McpRawConfig raw={stdioRaw()} />);
    expect(screen.getByText("command")).toBeInTheDocument();
    expect(screen.getByText("npx")).toBeInTheDocument();
    expect(screen.getByText("-y @context7/mcp")).toBeInTheDocument();
    expect(screen.getByText("API_KEY")).toBeInTheDocument();
    expect(screen.getByText("x")).toBeInTheDocument();
  });

  it("renders url and headers for an http server", () => {
    render(<McpRawConfig raw={httpRaw()} />);
    expect(screen.getByText("url")).toBeInTheDocument();
    expect(screen.getByText("https://api.example/mcp")).toBeInTheDocument();
    expect(screen.getByText("Authorization")).toBeInTheDocument();
    expect(screen.getByText("Bearer t")).toBeInTheDocument();
  });

  it("does not render stdio fields for an http server", () => {
    render(<McpRawConfig raw={httpRaw()} />);
    expect(screen.queryByText("command")).not.toBeInTheDocument();
  });

  it("omits empty env/headers sections", () => {
    render(<McpRawConfig raw={stdioRaw({ env: {} })} />);
    expect(screen.queryByText("env")).not.toBeInTheDocument();
  });
});
