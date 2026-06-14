import { describe, expect, it } from "vitest";

import {
  CONTEXT_WINDOW_TOKENS,
  estimateContextTokens,
  HEAVY_CONTEXT_RATIO,
  recommendResumeOption,
} from "@/components/Dashboard/Workspace/DashboardArea/Dashboard/SessionViewer/ResumeChoice/resumeRecommendation";
import type { SessionConversation, SessionMessage } from "@/lib/types";

const msg = (content: string): SessionMessage => ({
  role: "user",
  content,
  timestamp: "2026-06-11T00:00:00Z",
  uuid: crypto.randomUUID(),
});

const conversation = (messages: SessionMessage[]): SessionConversation => ({
  sessionId: "s",
  messages,
  totalTokensIn: 999_999, // intentionally huge to prove it is NOT used
  totalTokensOut: 999_999,
  model: null,
});

describe("estimateContextTokens", () => {
  it("estimates tokens as total content chars / 4", () => {
    const conv = conversation([msg("a".repeat(40)), msg("b".repeat(40))]);
    // 80 chars / 4 = 20 tokens
    expect(estimateContextTokens(conv)).toBe(20);
  });

  it("returns 0 for an empty conversation", () => {
    expect(estimateContextTokens(conversation([]))).toBe(0);
  });

  it("ignores totalTokensIn (uses content length only)", () => {
    const conv = conversation([msg("x".repeat(4))]);
    expect(estimateContextTokens(conv)).toBe(1);
  });
});

describe("recommendResumeOption", () => {
  it("defaults to 'continue' when no conversation is loaded", () => {
    expect(recommendResumeOption(null)).toBe("continue");
  });

  it("recommends 'continue' for a light conversation", () => {
    const conv = conversation([msg("hello world")]);
    expect(recommendResumeOption(conv)).toBe("continue");
  });

  it("recommends 'continue' for an empty conversation", () => {
    expect(recommendResumeOption(conversation([]))).toBe("continue");
  });

  it("recommends 'compact' when the estimate reaches the heavy threshold", () => {
    const heavyTokens = CONTEXT_WINDOW_TOKENS * HEAVY_CONTEXT_RATIO; // 100_000
    const chars = heavyTokens * 4; // 400_000 chars → exactly 100k tokens
    const conv = conversation([msg("x".repeat(chars))]);
    expect(estimateContextTokens(conv)).toBe(heavyTokens);
    expect(recommendResumeOption(conv)).toBe("compact");
  });

  it("recommends 'continue' just below the heavy threshold", () => {
    const heavyTokens = CONTEXT_WINDOW_TOKENS * HEAVY_CONTEXT_RATIO;
    const chars = heavyTokens * 4 - 4; // one token short
    const conv = conversation([msg("x".repeat(chars))]);
    expect(recommendResumeOption(conv)).toBe("continue");
  });
});
