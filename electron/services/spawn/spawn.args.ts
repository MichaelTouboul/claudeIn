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

// Server-side allowlist of `--permission-mode` values we forward as-is. `default`
// is deliberately EXCLUDED: it is the CLI's own default, so we omit the flag
// rather than pass a redundant `--permission-mode default` (and let the CLI /
// project settings decide). The composer surfaces only default/acceptEdits/plan
// today; the CLI's other valid values (auto/bypassPermissions/dontAsk) are simply
// not in this set, and any other string (XSS/compromised renderer) is dropped.
//
// Reconciliation: the app currently passes NO permission flag at all (no
// `--dangerously-skip-permissions`, no prior `--permission-mode`), so this is the
// sole permission flag on the command line — there is no precedence conflict.
const ALLOWED_PERMISSION_MODES: ReadonlySet<string> = new Set(["acceptEdits", "plan"]);

// Think toggle → effort level. The CLI has no `--think` flag, but `--effort
// <low|medium|high|xhigh|max>` ("Effort level for the current session") is real
// and works under `--print`. Think ON maps to `high` (a strong step up from the
// CLI default without reaching xhigh/max); Think OFF omits the flag so the CLI
// uses its own default effort.
const THINK_EFFORT = "high";

export type SpawnArgsInput = {
  agentName: string;
  mission: string;
  resumeSessionId?: string;
  // Optional model id (e.g. "claude-opus-4-8"). When provided, `--model <id>` is
  // appended among the flags, before the trailing mission arg. Absent => omitted,
  // so `claude` uses its own default model.
  model?: string;
  // Per-conversation permission mode (CLI `--permission-mode`). Forwarded only for
  // an allowlisted value; `default`/absent/unknown => omitted (CLI default).
  permissionMode?: string;
  // The composer's "Think" toggle. true => `--effort high`; false/absent => omitted.
  think?: boolean;
};

/**
 * Builds the `claude` CLI argument list for a spawned turn. Pure (no I/O), so the
 * flag wiring — including the optional `--model`, `--permission-mode` and
 * `--effort` — is unit-testable.
 *
 * `--append-system-prompt` is added ahead of the resume/fresh branch so the
 * no-follow-up steering is re-passed on EVERY turn (including `--resume`, where
 * the CLI does not carry a prior turn's appended prompt forward). `--model`,
 * `--permission-mode` and `--effort`, when present, are pushed among the flags
 * before the final mission arg.
 */
export function buildSpawnArgs({
  agentName,
  mission,
  resumeSessionId,
  model,
  permissionMode,
  think,
}: SpawnArgsInput): string[] {
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

  // Only forward `--permission-mode` for an allowlisted value (same guard shape as
  // `--model`); `default`/absent/unknown => omitted so the CLI uses its default.
  if (permissionMode && ALLOWED_PERMISSION_MODES.has(permissionMode)) {
    args.push("--permission-mode", permissionMode);
  }

  // Think ON => `--effort high`; OFF/absent => omitted (CLI default effort).
  if (think) {
    args.push("--effort", THINK_EFFORT);
  }

  args.push(mission);

  return args;
}
