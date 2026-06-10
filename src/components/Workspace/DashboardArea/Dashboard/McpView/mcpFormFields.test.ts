import { describe, expect, it } from "vitest";

import type { McpTransportInput } from "@/types/mcp-manage.types";

import { mcpFormFields } from "./mcpFormFields";

const allTransports: McpTransportInput[] = ["stdio", "http", "sse"];

describe("mcpFormFields", () => {
  it("has an entry for every transport (no fallback chain)", () => {
    for (const transport of allTransports) {
      expect(mcpFormFields[transport]).toBeDefined();
      expect(Array.isArray(mcpFormFields[transport].required)).toBe(true);
    }
    expect(Object.keys(mcpFormFields).sort()).toEqual([...allTransports].sort());
  });

  it("stdio requires command", () => {
    expect(mcpFormFields.stdio.required).toEqual(["command"]);
  });

  it("http requires url", () => {
    expect(mcpFormFields.http.required).toEqual(["url"]);
  });

  it("sse requires url", () => {
    expect(mcpFormFields.sse.required).toEqual(["url"]);
  });
});
