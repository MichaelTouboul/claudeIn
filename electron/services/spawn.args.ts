import { NO_FOLLOWUP_SYSTEM_PROMPT } from "./spawn.steering";

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

  if (model) {
    args.push("--model", model);
  }

  args.push(mission);

  return args;
}
