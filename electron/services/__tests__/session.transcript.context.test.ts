// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  contextFillToPercent,
  contextPercent,
  extractContextFill,
  extractResolvedModel,
  resolveContextWindow,
} from "../session/session.transcript";

// Helper: build a parsed assistant transcript line with a `usage` block.
function assistant(usage: Record<string, number>): Record<string, unknown> {
  return { type: "assistant", message: { model: "claude-opus-4-8", usage } };
}

describe("extractContextFill — prompt-side tokens only", () => {
  it("sums input + cache_read + cache_creation but EXCLUDES output", () => {
    // output_tokens are the model's *response*, not part of the context prefix
    // at the moment usage is reported. Including them overshoots the real fill.
    const fill = extractContextFill(
      assistant({
        input_tokens: 2,
        cache_read_input_tokens: 171_554,
        cache_creation_input_tokens: 938,
        output_tokens: 730,
      }),
    );
    expect(fill).toBe(2 + 171_554 + 938); // 172_494, NOT + 730
  });

  it("treats missing cache/creation fields as 0", () => {
    expect(extractContextFill(assistant({ input_tokens: 10_000 }))).toBe(10_000);
  });

  it("returns null for a non-assistant line", () => {
    expect(extractContextFill({ type: "user", message: {} })).toBeNull();
  });

  it("returns null when there is no usage block", () => {
    expect(extractContextFill({ type: "assistant", message: {} })).toBeNull();
  });

  it("returns null when the prompt-side fill is zero", () => {
    expect(extractContextFill(assistant({ output_tokens: 500 }))).toBeNull();
  });
});

describe("contextFillToPercent — tiered context window", () => {
  it("0 tokens of fill → null (no bar)", () => {
    expect(contextFillToPercent(null)).toBeNull();
  });

  it("near-empty fill → a small percentage of the 200k window", () => {
    // 2_000 / 200_000 → 1%
    expect(contextFillToPercent(2_000)).toBe(1);
  });

  it("a 200k-tier session reads against the 200k window (≥85% case)", () => {
    // 172_494 / 200_000 → 86%
    expect(contextFillToPercent(172_494)).toBe(86);
  });

  it("a 1M-tier fill (>200k) reads against the 1M window, NOT clamped to 100", () => {
    // Real ground-truth case: a session whose prefix reached 786_904 tokens is
    // running on the 1M window → ~79%, never an aberrant clamp to 100.
    expect(contextFillToPercent(786_904)).toBe(79);
  });

  it("just over the 200k boundary promotes to the 1M window", () => {
    // 200_001 must NOT read as 100% of a 200k window — it promotes to 1M → 20%.
    expect(contextFillToPercent(200_001)).toBe(20);
  });

  it("clamps at 100 only for a genuinely over-full 1M context", () => {
    expect(contextFillToPercent(1_200_000)).toBe(100);
  });
});

describe("resolveContextWindow — single source of truth for the window", () => {
  it("tiers by observed fill when no resolvedModel marker is present", () => {
    expect(resolveContextWindow(173_000)).toBe(200_000);
    expect(resolveContextWindow(786_904)).toBe(1_000_000);
    expect(resolveContextWindow(200_001)).toBe(1_000_000);
  });

  it("an explicit [1m] resolvedModel pins the window to 1M, overriding the tier", () => {
    // A small fill that would otherwise tier to 200k must read against 1M when
    // the transcript persisted the window-qualified model id.
    expect(resolveContextWindow(2_000, "claude-opus-4-8[1m]")).toBe(1_000_000);
    expect(resolveContextWindow(173_000, "claude-opus-4-8[1m]")).toBe(1_000_000);
  });

  it("a bare (non-[1m]) resolvedModel falls back to fill tiering", () => {
    expect(resolveContextWindow(173_000, "claude-opus-4-8")).toBe(200_000);
    expect(resolveContextWindow(2_000, null)).toBe(200_000);
  });
});

describe("contextPercent — clamp against an explicit window", () => {
  it("computes the rounded percent of the given window", () => {
    expect(contextPercent(172_494, 200_000)).toBe(86);
    expect(contextPercent(2_000, 1_000_000)).toBe(0);
  });

  it("clamps to 100 for an over-full window", () => {
    expect(contextPercent(1_200_000, 1_000_000)).toBe(100);
  });
});

describe("contextFillToPercent — honors the [1m] marker", () => {
  it("a small 1M-pinned fill reads as a small % of 1M, not of 200k", () => {
    // 173_000 / 1_000_000 → 17 (NOT 87 against a 200k window).
    expect(contextFillToPercent(173_000, "claude-opus-4-8[1m]")).toBe(17);
  });
});

describe("extractResolvedModel — toolUseResult.resolvedModel", () => {
  it("returns the resolvedModel string when present", () => {
    expect(
      extractResolvedModel({ toolUseResult: { resolvedModel: "claude-opus-4-8[1m]" } }),
    ).toBe("claude-opus-4-8[1m]");
  });

  it("returns null when absent or not a string", () => {
    expect(extractResolvedModel({})).toBeNull();
    expect(extractResolvedModel({ toolUseResult: {} })).toBeNull();
    expect(extractResolvedModel({ toolUseResult: { resolvedModel: 1 } })).toBeNull();
  });
});

describe("persisted ↔ live parity — same transcript state → same percent", () => {
  // The persisted sidebar path and the live watch path BOTH route through the
  // same consolidated math (extractContextFill → resolveContextWindow →
  // contextPercent). Given an identical last-turn line and resolvedModel, the
  // two MUST produce the identical number — that is the whole point of Option A.
  function deriveLikePersisted(line: Record<string, unknown>, resolvedModel: string | null) {
    const fill = extractContextFill(line);
    return contextFillToPercent(fill, resolvedModel);
  }
  function deriveLikeLive(line: Record<string, unknown>, resolvedModel: string | null) {
    const fill = extractContextFill(line);
    if (fill === null) return null;
    return contextPercent(fill, resolveContextWindow(fill, resolvedModel));
  }

  it("agree on a 200k-tier session (no marker)", () => {
    const line = assistant({ input_tokens: 2, cache_read_input_tokens: 171_554, cache_creation_input_tokens: 938 });
    expect(deriveLikeLive(line, null)).toBe(deriveLikePersisted(line, null));
    expect(deriveLikeLive(line, null)).toBe(86);
  });

  it("agree on a [1m]-pinned session", () => {
    const line = assistant({ input_tokens: 2, cache_read_input_tokens: 171_554, cache_creation_input_tokens: 938 });
    const marker = "claude-opus-4-8[1m]";
    expect(deriveLikeLive(line, marker)).toBe(deriveLikePersisted(line, marker));
    expect(deriveLikeLive(line, marker)).toBe(17);
  });
});
