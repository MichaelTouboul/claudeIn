import type { Prompt } from "./prompt.types";

/**
 * The PromptLayer-style observability hook. Renders a registered prompt for a
 * given input and emits a lightweight debug log of `{ id, version }` so every
 * LLM prompt the app sends is traceable to its registry entry. Side-effect-light:
 * the log is guarded behind `console.debug` (the main process has no logger
 * abstraction) and the function simply returns `prompt.build(input)` — the
 * produced string is byte-identical to calling `build` directly.
 */
export function renderPrompt<Input>(prompt: Prompt<Input>, input: Input): string {
  console.debug(`[prompt] render ${prompt.id} v${prompt.version}`);
  return prompt.build(input);
}
