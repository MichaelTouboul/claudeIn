// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  contextFillToPercent,
  extractContextFill,
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
