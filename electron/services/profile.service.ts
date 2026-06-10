import { spawn } from "node:child_process";
import { getDb } from "./db";
import { computeInputsHash } from "./profile.hash";
import type { ScopeProfile } from "../types/onboarding.types";

type Scope = ScopeProfile["scope"];

/** Arguments handed to the spawn seam — asserted by tests, used by the real runner. */
export type ProfileRunnerArgs = {
  /** Full command line for the spawn (e.g. `claude --print`). */
  command: string;
  /** Working directory the agentic run executes in (= the scope root). */
  cwd: string;
  /** The exploration prompt fed to the agent on stdin. */
  prompt: string;
};

/** The seam: run an agentic `claude --print` and resolve its captured stdout. */
export type ProfileRunner = (args: ProfileRunnerArgs) => Promise<string>;

const PROFILE_COMMAND = "claude --print";

// Default runner: spawn `claude --print` with cwd = scope root, feed the prompt
// on stdin, capture stdout. Subscription auth via `--print` (the app's existing
// LLM path — no Agent-SDK/API-key migration). Tests swap this via
// `setProfileRunner` so no real `claude`/network is ever invoked.
const defaultRunner: ProfileRunner = ({ cwd, prompt }) =>
  new Promise<string>((resolve, reject) => {
    const proc = spawn("claude", ["--print"], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd,
      env: { ...process.env, FORCE_COLOR: "0" },
    });

    let stdout = "";
    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`claude --print exited with code ${code}`));
    });

    proc.stdin?.write(prompt);
    proc.stdin?.end();
  });

let runner: ProfileRunner = defaultRunner;

/** Swap the spawn seam (used by tests to stub the agentic run). */
export function setProfileRunner(next: ProfileRunner): void {
  runner = next;
}

function buildPrompt(plugins: string[]): string {
  const pluginsLine =
    plugins.length > 0
      ? `The following other-plugin data dirs were detected alongside it: ${plugins.join(", ")}.`
      : "No other-plugin data dirs were detected.";
  return `Explore the \`.claude\` directory at this root on your own — its agents, skills, MCP servers, hooks, and memory/CLAUDE.md. ${pluginsLine}

Produce a concise narrative markdown profile of this setup: what's configured, what each major piece is for, and how the pieces fit together. Output only the profile.`;
}

function rowToProfile(row: Record<string, unknown>): ScopeProfile {
  return {
    scopePath: row.scope_path as string,
    scope: row.scope as Scope,
    profileMd: row.profile_md as string,
    generatedAt: row.generated_at as string,
  };
}

/**
 * Run the agentic profiler at `scopePath` and upsert the result. Spawns
 * `claude --print` with `cwd = scopePath` and a prompt to explore `.claude`
 * (plus the detected `plugins`), captures stdout as the narrative profile, and
 * persists it with a staleness hash of the `.claude` tree.
 */
export async function ingestScope(
  scopePath: string,
  scope: Scope,
  plugins: string[]
): Promise<ScopeProfile> {
  const prompt = buildPrompt(plugins);
  const profileMd = await runner({ command: PROFILE_COMMAND, cwd: scopePath, prompt });
  const inputsHash = await computeInputsHash(scopePath);
  const generatedAt = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO scope_profiles (scope_path, scope, profile_md, inputs_hash, generated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(scope_path) DO UPDATE SET
         scope = excluded.scope,
         profile_md = excluded.profile_md,
         inputs_hash = excluded.inputs_hash,
         generated_at = excluded.generated_at`
    )
    .run(scopePath, scope, profileMd, inputsHash, generatedAt);

  return { scopePath, scope, profileMd, generatedAt };
}

/** The stored profile for a scope, or `null` when none has been generated. */
export function getProfile(scopePath: string): ScopeProfile | null {
  const row = getDb()
    .prepare(
      "SELECT scope_path, scope, profile_md, generated_at FROM scope_profiles WHERE scope_path = ?"
    )
    .get(scopePath);
  return row ? rowToProfile(row) : null;
}

/** All persisted scope profiles. */
export function listProfiles(): ScopeProfile[] {
  return getDb()
    .prepare("SELECT scope_path, scope, profile_md, generated_at FROM scope_profiles")
    .all()
    .map(rowToProfile);
}

/**
 * Re-run ingestion for an already-known scope, overwriting its row (and bumping
 * `generatedAt`). Reuses the stored `scope` so the caller need only name the path.
 */
export async function refreshProfile(scopePath: string): Promise<ScopeProfile> {
  const existing = getProfile(scopePath);
  const scope: Scope = existing?.scope ?? "project";
  return ingestScope(scopePath, scope, []);
}
