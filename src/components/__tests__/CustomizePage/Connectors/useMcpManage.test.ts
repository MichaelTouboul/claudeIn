import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMcpManage } from "@/components/CustomizePage/Connectors/useMcpManage";
import type { McpAddInput, McpServerRaw } from "@/lib/types";

function makeRaw(name: string): McpServerRaw {
  return { name, transport: "stdio", scope: "project", command: "npx", args: ["-y", name] };
}

function makeInput(name: string): McpAddInput {
  return { name, scope: "user", transport: "stdio", command: "npx" };
}

describe("useMcpManage", () => {
  beforeEach(() => {
    window.api = {
      getMcpRaw: vi.fn(async (name: string) => makeRaw(name)),
      removeMcpServer: vi.fn(async () => ({ ok: true as const })),
      addMcpServer: vi.fn(async () => ({ ok: true as const })),
      editMcpServer: vi.fn(async () => ({ ok: true as const })),
    } as unknown as Window["api"];
  });

  it("getRaw forwards name/scope/projectPath to the IPC and returns the raw config", async () => {
    const { result } = renderHook(() => useMcpManage());
    let raw: McpServerRaw | undefined;
    await act(async () => {
      raw = await result.current.getRaw("gh", "user", "/repo");
    });
    expect(window.api.getMcpRaw).toHaveBeenCalledWith("gh", "user", "/repo");
    expect(raw).toEqual(makeRaw("gh"));
  });

  it("starts with needsRestart false and no error", () => {
    const { result } = renderHook(() => useMcpManage());
    expect(result.current.needsRestart).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("a successful remove forwards args, sets needsRestart, leaves error null", async () => {
    const { result } = renderHook(() => useMcpManage());
    await act(async () => {
      await result.current.remove("gh", "user", "/repo");
    });
    expect(window.api.removeMcpServer).toHaveBeenCalledWith("gh", "user", "/repo");
    expect(result.current.needsRestart).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("a failed (ok:false) remove surfaces the error and does not set needsRestart", async () => {
    (window.api.removeMcpServer as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      error: "no such server",
    });
    const { result } = renderHook(() => useMcpManage());
    await act(async () => {
      await result.current.remove("ghost", "user");
    });
    expect(result.current.needsRestart).toBe(false);
    expect(result.current.error).toBe("no such server");
  });

  it("a later successful mutation clears a prior error", async () => {
    (window.api.removeMcpServer as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: false, error: "boom" })
      .mockResolvedValueOnce({ ok: true });
    const { result } = renderHook(() => useMcpManage());
    await act(async () => {
      await result.current.remove("a", "user");
    });
    expect(result.current.error).toBe("boom");
    await act(async () => {
      await result.current.remove("b", "user");
    });
    expect(result.current.error).toBeNull();
    expect(result.current.needsRestart).toBe(true);
  });

  it("remove returns the mutation result to the caller", async () => {
    const { result } = renderHook(() => useMcpManage());
    let res: { ok: boolean } | undefined;
    await act(async () => {
      res = await result.current.remove("gh", "user");
    });
    expect(res).toEqual({ ok: true });
  });

  it("a successful add forwards the input and sets needsRestart", async () => {
    const { result } = renderHook(() => useMcpManage());
    const input = makeInput("pw");
    await act(async () => {
      await result.current.add(input);
    });
    expect(window.api.addMcpServer).toHaveBeenCalledWith(input);
    expect(result.current.needsRestart).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("a failed add surfaces the error and does not set needsRestart", async () => {
    (window.api.addMcpServer as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      error: "duplicate name",
    });
    const { result } = renderHook(() => useMcpManage());
    await act(async () => {
      await result.current.add(makeInput("pw"));
    });
    expect(result.current.needsRestart).toBe(false);
    expect(result.current.error).toBe("duplicate name");
  });

  it("a successful edit forwards name + input and sets needsRestart", async () => {
    const { result } = renderHook(() => useMcpManage());
    const input = makeInput("gh");
    await act(async () => {
      await result.current.edit("gh", input);
    });
    expect(window.api.editMcpServer).toHaveBeenCalledWith("gh", input);
    expect(result.current.needsRestart).toBe(true);
  });
});
