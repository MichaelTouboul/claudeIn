import { ipcMain } from "electron";

import { transform } from "../services/transform/transform.service";
import { TransformKind, type TransformInput } from "../services/transform/transform.types";

/**
 * Runtime guard at the IPC boundary: TypeScript types are erased, so the
 * renderer payload must be validated before it reaches the service. An invalid
 * `kind` would otherwise resolve `undefined` in the prompt maps and produce a
 * malformed prompt; non-string fields would be written to stdin verbatim.
 */
function isTransformInput(input: unknown): input is TransformInput {
  if (typeof input !== "object" || input === null) return false;
  const candidate = input as Record<string, unknown>;
  return (
    typeof candidate.kind === "string" &&
    (Object.values(TransformKind) as string[]).includes(candidate.kind) &&
    typeof candidate.instruction === "string" &&
    typeof candidate.content === "string"
  );
}

/**
 * `panel:transform` — the renderer's one-shot LLM entry point for the response
 * panel. Thin adapter: validates the input, forwards it to the isolated
 * `transform` service, returns its text result. No session, no persistence, no
 * broadcast. Invalid input resolves to `''` (the renderer simply no-ops).
 */
export function registerTransformHandlers(): void {
  ipcMain.handle("panel:transform", (_e, input: unknown) =>
    isTransformInput(input) ? transform(input) : "",
  );
}
