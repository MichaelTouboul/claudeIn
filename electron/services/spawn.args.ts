import { NO_FOLLOWUP_SYSTEM_PROMPT } from "./spawn.steering";

// Server-side allowlist of model ids that may be forwarded to `claude --model`.
// This is the authoritative guard: the renderer's `MODELS` list is convenience
// only and is bypassable from a compromised/XSS'd renderer, so any `model` that
// is not exactly one of these is dropped here before it can reach the subprocess.
// Keep in sync with `src/store/useModelStore.ts` MODELS.
export const ALLOWED_MODELS = [
  "claude-opus-4-8",
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001",
] as const;

const ALLOWED_MODEL_SET: ReadonlySet<string> = new Set(ALLOWED_MODELS);

export type SpawnArgsInput = {
  agentName: string;
  mission: string;
  resumeSessionId?: string;
  // Optional model id (e.g. "claude-opus-4-8"). When provided, `--model <id>` is
  // appended among the flags, before the trailing mission arg. Absent => omitted,
  // so `claude` uses its own default model.
  model?: string;
};

/**
 * Builds the `claude` CLI argument list for a spawned turn. Pure (no I/O), so the
 * flag wiring — including the optional `--model` — is unit-testable.
 *
 * `--append-system-prompt` is added ahead of the resume/fresh branch so the
 * no-follow-up steering is re-passed on EVERY turn (including `--resume`, where
 * the CLI does not carry a prior turn's appended prompt forward). `--model`, when
 * present, is pushed among the flags before the final mission arg.
 */
export function buildSpawnArgs({ agentName, mission, resumeSessionId, model }: SpawnArgsInput): string[] {
  const args = [
    "--print",
    "--output-format", "stream-json",
    "--verbose",
    "--max-turns", "50",
    "--append-system-prompt", NO_FOLLOWUP_SYSTEM_PROMPT,
  ];

  if (resumeSessionId) {
    args.push("--resume", resumeSessionId);
  } else {
    const agentFlag = agentName && agentName !== "_main";
    if (agentFlag) {
      args.push("--agent", agentName);
    }
  }

  // Only forward `--model` for an allowlisted id; anything else (empty, unknown,
  // or a malicious string from a compromised renderer) is silently dropped so
  // `claude` falls back to its default model.
  if (model && ALLOWED_MODEL_SET.has(model)) {
    args.push("--model", model);
  }

  args.push(mission);

  return args;
}
