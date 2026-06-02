// @vitest-environment node
import { describe, expect, it } from "vitest";

import { NO_FOLLOWUP_SYSTEM_PROMPT } from "./spawn.steering";

describe("NO_FOLLOWUP_SYSTEM_PROMPT steering", () => {
  it("embeds the cam-ask schema markers", () => {
    expect(NO_FOLLOWUP_SYSTEM_PROMPT).toContain("cam-ask");
    expect(NO_FOLLOWUP_SYSTEM_PROMPT).toContain('"type":"choice"');
    expect(NO_FOLLOWUP_SYSTEM_PROMPT).toContain('"type":"text"');
    expect(NO_FOLLOWUP_SYSTEM_PROMPT).toContain("options");
    expect(NO_FOLLOWUP_SYSTEM_PROMPT).toContain("variant");
  });

  it("conveys the only-when-blocked rule", () => {
    expect(NO_FOLLOWUP_SYSTEM_PROMPT).toMatch(/only when you are actually blocked/i);
    expect(NO_FOLLOWUP_SYSTEM_PROMPT).toMatch(/genuinely need a decision or input/i);
  });

  it("conveys the no-trailing-question-otherwise rule", () => {
    expect(NO_FOLLOWUP_SYSTEM_PROMPT).toMatch(/end your turn with a statement/i);
    expect(NO_FOLLOWUP_SYSTEM_PROMPT).toMatch(/no trailing question/i);
  });

  it("no longer uses the old absolute forbid-all-questions wording", () => {
    expect(NO_FOLLOWUP_SYSTEM_PROMPT).not.toMatch(/Never append a follow-up question/i);
    expect(NO_FOLLOWUP_SYSTEM_PROMPT).not.toMatch(/Do not ask whether to proceed/i);
  });
});
