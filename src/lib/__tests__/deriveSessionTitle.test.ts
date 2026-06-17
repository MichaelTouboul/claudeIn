import { describe, expect, it } from "vitest";

import { deriveSessionTitle, sanitizeCommandEnvelope } from "@/lib/utils";

describe("sanitizeCommandEnvelope", () => {
  it("turns a slash-command envelope into the command name", () => {
    const raw =
      "<command-message>loop</command-message><command-name>/loop</command-name>run the loop";
    expect(sanitizeCommandEnvelope(raw)).toBe("/loop");
  });

  it("falls back to the command-message text when there is no command-name", () => {
    const raw = "<command-message>do the loop</command-message>";
    expect(sanitizeCommandEnvelope(raw)).toBe("do the loop");
  });

  it("strips any leftover <command-*> wrappers but keeps inner text", () => {
    const raw = "<command-args>--fast</command-args>just go";
    expect(sanitizeCommandEnvelope(raw)).toBe("--fast just go");
  });

  it("leaves a plain prompt untouched", () => {
    expect(sanitizeCommandEnvelope("Refactor the title resolver")).toBe(
      "Refactor the title resolver",
    );
  });

  it("does not strip legitimate angle-bracket content that is not a command envelope", () => {
    const raw = "Compare a < b and emit <Foo /> in JSX";
    expect(sanitizeCommandEnvelope(raw)).toBe("Compare a < b and emit <Foo /> in JSX");
  });
});

describe("deriveSessionTitle", () => {
  const base = { sessionId: "abcdef1234567890", title: null, firstPrompt: null };

  it("prefers an explicit userTitle over everything", () => {
    expect(
      deriveSessionTitle({
        ...base,
        firstPrompt: "<command-name>/loop</command-name>",
        userTitle: "My rename",
        aiTitle: "AI guess",
        title: "Stored",
      }),
    ).toBe("My rename");
  });

  it("prefers aiTitle over session title and firstPrompt", () => {
    expect(
      deriveSessionTitle({ ...base, aiTitle: "AI guess", title: "Stored", firstPrompt: "x" }),
    ).toBe("AI guess");
  });

  it("prefers session.title over firstPrompt", () => {
    expect(deriveSessionTitle({ ...base, title: "Stored", firstPrompt: "x" })).toBe("Stored");
  });

  it("sanitizes a slash-command firstPrompt into a clean title", () => {
    expect(
      deriveSessionTitle({
        ...base,
        firstPrompt:
          "<command-message>loop</command-message><command-name>/loop</command-name>run the loop",
      }),
    ).toBe("/loop");
  });

  it("passes a plain firstPrompt through unchanged", () => {
    expect(deriveSessionTitle({ ...base, firstPrompt: "Fix the bug" })).toBe("Fix the bug");
  });

  it("falls back to the short sessionId when there is no prompt at all", () => {
    expect(deriveSessionTitle(base)).toBe("abcdef12");
  });

  it("falls back to the short sessionId when firstPrompt sanitizes to empty", () => {
    expect(deriveSessionTitle({ ...base, firstPrompt: "<command-message></command-message>" })).toBe(
      "abcdef12",
    );
  });
});
