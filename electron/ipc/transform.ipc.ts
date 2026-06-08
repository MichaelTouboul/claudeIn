import { ipcMain } from "electron";

import { transform } from "../services/transform.service";
import type { TransformInput } from "../services/transform.prompt";

/**
 * `panel:transform` — the renderer's one-shot LLM entry point for the response
 * panel. Thin adapter: forwards the typed input to the isolated `transform`
 * service and returns its text result. No session, no persistence, no broadcast.
 */
export function registerTransformHandlers(): void {
  ipcMain.handle("panel:transform", (_e, input: TransformInput) => transform(input));
}
