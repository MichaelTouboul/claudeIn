import type { McpTransportInput } from "@/lib/types";

/** Which input fields a given transport requires before it can be submitted. */
export type McpFormFieldSpec = {
  required: string[];
};

// Behavior-per-transport map: the transport drives which fields the Add/Edit
// form requires. EVERY transport has an explicit entry — no fallback chain.
// stdio → command; http/sse → url.
export const mcpFormFields: Record<McpTransportInput, McpFormFieldSpec> = {
  stdio: { required: ["command"] },
  http: { required: ["url"] },
  sse: { required: ["url"] },
};
