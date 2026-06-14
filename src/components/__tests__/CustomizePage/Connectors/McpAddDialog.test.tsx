import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { McpAddDialog } from "@/components/CustomizePage/Connectors/McpAddDialog";
import type { McpMutationResult } from "@/types/mcp-manage.types";

function okSubmit(): Promise<McpMutationResult> {
  return Promise.resolve({ ok: true });
}

describe("McpAddDialog", () => {
  it("does not render the form when closed", () => {
    render(<McpAddDialog mode="add" open={false} onOpenChange={() => {}} onSubmit={okSubmit} />);
    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
  });

  it("renders an accessible dialog with the form when open", () => {
    render(<McpAddDialog mode="add" open onOpenChange={() => {}} onSubmit={okSubmit} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it("closes on a successful submit", async () => {
    const onOpenChange = vi.fn();
    const onSubmit = vi.fn(okSubmit);
    render(<McpAddDialog mode="add" open onOpenChange={onOpenChange} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "pw" } });
    fireEvent.change(screen.getByLabelText(/command/i), { target: { value: "npx" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("stays open and shows the error on a failed submit", async () => {
    const onOpenChange = vi.fn();
    const onSubmit = vi.fn(async (): Promise<McpMutationResult> => ({
      ok: false,
      error: "boom",
    }));
    render(<McpAddDialog mode="add" open onOpenChange={onOpenChange} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "pw" } });
    fireEvent.change(screen.getByLabelText(/command/i), { target: { value: "npx" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("boom"));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("passes initialValues through for edit mode", () => {
    render(
      <McpAddDialog
        mode="edit"
        open
        onOpenChange={() => {}}
        onSubmit={okSubmit}
        initialValues={{ name: "gh", scope: "user", transport: "stdio", command: "x" }}
      />,
    );
    const expectInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    expect(expectInput.value).toBe("gh");
  });
});
