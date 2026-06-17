/**
 * Phantom-transcript detection. The app runs one-shot `claude --print` helpers
 * (repo-label, scope-profile, conversation-title, panel-transform, user-profile).
 * When such a helper happens to run with `cwd = a scanned repo`, Claude Code
 * writes a throwaway `.jsonl` transcript into `~/.claude/projects/<cwd>/`, which
 * the session scanner would otherwise list as a phantom "session". This module
 * decides, from structural signals collected during the listing pass, whether a
 * transcript is such a helper run — so `listSessions` can skip it while NEVER
 * filtering a real interactive conversation.
 */

/** Structural signals collected from a transcript in a single pass. */
export type PhantomSignals = {
  /** Distinct top-level `type` values seen across all lines. */
  types: Set<string>;
  /** Count of user turns (`type === "user"` with a `promptId`). */
  userTurnCount: number;
  /** The first user message's full (untruncated) text, or `null`. */
  firstUserPrompt: string | null;
};

/**
 * Top-level transcript line `type` values that appear ONLY in real interactive
 * Claude Code sessions — the in-app `claude --print` one-shot helpers never emit
 * them. `last-prompt`/`mode`/`permission-mode` are the interactive shell's own
 * metadata; `agent-setting`/`ai-title`/`queue-operation` are interactive-only
 * annotations. Presence of any one is a strong signal of a real conversation.
 */
const INTERACTIVE_METADATA_TYPES = new Set<string>([
  "last-prompt",
  "mode",
  "permission-mode",
  "agent-setting",
  "ai-title",
  "queue-operation",
]);

/**
 * Distinctive leading phrases of the app's centralized registry prompts
 * (`electron/services/prompts/`). A one-shot helper transcript's first user
 * message starts with exactly one of these. They are hardcoded (not rendered)
 * because the registry prompts need inputs to render, and a stable lead prefix
 * is enough to match without risk of a real conversation colliding.
 */
const KNOWN_INTERNAL_PROMPT_PREFIXES = [
  "In one short sentence, describe what this repository",
  "Below is a plain-text snapshot of a Claude Code setup",
  "Explore the user-scope `.claude` directory",
  "You are labeling a conversation.",
  "You are a deterministic document transformer",
] as const;

/**
 * True when the first user message begins with a known internal prompt — the
 * complementary signal that catches a helper run even if its structure is
 * borderline. Matched by leading-prefix so prompt bodies (which vary by input)
 * never affect the decision.
 */
export function matchesKnownInternalPrompt(firstUserPrompt: string | null): boolean {
  if (firstUserPrompt === null) return false;
  const head = firstUserPrompt.trimStart();
  return KNOWN_INTERNAL_PROMPT_PREFIXES.some((prefix) => head.startsWith(prefix));
}

/**
 * Decide whether a transcript is a phantom one-shot `--print` helper run rather
 * than a real interactive session.
 *
 * Two independent signals, OR-combined:
 *  - STRUCTURAL (primary): the transcript carries NONE of the interactive-only
 *    metadata line types AND has at most one user turn. A real conversation
 *    always has the metadata lines and/or multiple user turns, so it can never
 *    be filtered by this branch.
 *  - REGISTRY-PREFIX (complement): the first user message starts with a known
 *    internal prompt — catches a helper run even if its structure looks borderline.
 */
export function isPhantomHelperTranscript(args: PhantomSignals): boolean {
  const { types, userTurnCount, firstUserPrompt } = args;
  let noInteractiveMeta = true;
  for (const t of types) {
    if (INTERACTIVE_METADATA_TYPES.has(t)) {
      noInteractiveMeta = false;
      break;
    }
  }
  return (noInteractiveMeta && userTurnCount <= 1) || matchesKnownInternalPrompt(firstUserPrompt);
}
