import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { McpAddInput, McpMutationResult } from "@/types/mcp-manage.types";

import { McpServerForm } from "./McpServerForm";

function okSubmit(): Promise<McpMutationResult> {
  return Promise.resolve({ ok: true });
}

describe("McpServerForm", () => {
  it("renders name, scope, transport and the stdio command field by default", () => {
    render(<McpServerForm mode="add" onSubmit={okSubmit} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/scope/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/transport/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/command/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^url$/i)).not.toBeInTheDocument();
  });

  it("switches to url/headers fields when transport is http", () => {
    render(<McpServerForm mode="add" onSubmit={okSubmit} />);
    fireEvent.change(screen.getByLabelText(/transport/i), { target: { value: "http" } });
    expect(screen.getByLabelText(/^url$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/command/i)).not.toBeInTheDocument();
  });

  it("submits a stdio McpAddInput with parsed args and env", async () => {
    const onSubmit = vi.fn(okSubmit);
    render(<McpServerForm mode="add" onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "pw" } });
    fireEvent.change(screen.getByLabelText(/scope/i), { target: { value: "local" } });
    fireEvent.change(screen.getByLabelText(/command/i), { target: { value: "npx" } });
    fireEvent.change(screen.getByLabelText(/args/i), { target: { value: "-y @playwright/mcp" } });
    fireEvent.change(screen.getByLabelText(/env/i), { target: { value: "API_KEY=x" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "pw",
        scope: "local",
        transport: "stdio",
        command: "npx",
        args: ["-y", "@playwright/mcp"],
        env: { API_KEY: "x" },
      } satisfies McpAddInput),
    );
  });

  it("submits an http McpAddInput with url and headers", async () => {
    const onSubmit = vi.fn(okSubmit);
    render(<McpServerForm mode="add" onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "gh" } });
    fireEvent.change(screen.getByLabelText(/scope/i), { target: { value: "user" } });
    fireEvent.change(screen.getByLabelText(/transport/i), { target: { value: "http" } });
    fireEvent.change(screen.getByLabelText(/^url$/i), { target: { value: "https://api/mcp" } });
    fireEvent.change(screen.getByLabelText(/headers/i), {
      target: { value: "Authorization=Bearer t" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "gh",
        scope: "user",
        transport: "http",
        url: "https://api/mcp",
        headers: { Authorization: "Bearer t" },
      } satisfies McpAddInput),
    );
  });

  it("blocks submit and shows a hint when a required field is empty", async () => {
    const onSubmit = vi.fn(okSubmit);
    render(<McpServerForm mode="add" onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "pw" } });
    // command left blank
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("prefills from initialValues in edit mode and labels the submit Save", () => {
    render(
      <McpServerForm
        mode="edit"
        initialValues={{ name: "gh", scope: "user", transport: "http", url: "https://api/mcp" }}
        onSubmit={okSubmit}
      />,
    );
    expect(screen.getByLabelText(/name/i)).toHaveValue("gh");
    expect(screen.getByLabelText(/^url$/i)).toHaveValue("https://api/mcp");
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("surfaces the CLI error from a failed submit", async () => {
    const onSubmit = vi.fn(async (): Promise<McpMutationResult> => ({
      ok: false,
      error: "name already exists",
    }));
    render(<McpServerForm mode="add" onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "pw" } });
    fireEvent.change(screen.getByLabelText(/command/i), { target: { value: "npx" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("name already exists"));
  });
});
