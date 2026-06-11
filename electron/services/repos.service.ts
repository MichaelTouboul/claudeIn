import { spawn } from "node:child_process";

import { scanCandidates } from "./onboarding.service";
import type { Candidate } from "../types/onboarding.types";
import type { RepoCandidate } from "../types/user.type";

/**
 * Repo discovery for the Home page: reuse the bounded FS scan
 * (`onboarding.service.scanCandidates`), keep only `scope = project` repos, and
 * attach a short per-repo LLM label via the runner seam. The seam is stubbed in
 * tests so no real `claude` / network is invoked; a runner failure degrades to a
 * `null` label rather than failing the whole scan.
 */

type ReposRunnerArgs = { command: string; cwd: string; prompt: string };
type ReposRunner = (args: ReposRunnerArgs) => Promise<string>;

const REPOS_COMMAND = "claude --print";

const defaultRunner: ReposRunner = ({ cwd, prompt }) =>
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

let runner: ReposRunner = defaultRunner;

/** Swap the spawn seam (used by tests to stub the per-repo label run). */
export function setReposRunner(next: ReposRunner): void {
  runner = next;
}

function labelPrompt(): string {
  return "In one short sentence, describe what this repository is and does, based on its `.claude` setup and top-level files. Output only that sentence.";
}

async function labelFor(candidate: Candidate): Promise<RepoCandidate> {
  try {
    const label = await runner({
      command: REPOS_COMMAND,
      cwd: candidate.path,
      prompt: labelPrompt(),
    });
    return { ...candidate, label: label.length > 0 ? label : null };
  } catch {
    return { ...candidate, label: null };
  }
}

/**
 * Scan `root` (default `$HOME`) for repos, keep only project-scope ones, and
 * label each via the runner seam. Returns the labeled candidates in scan order.
 */
export async function scanRepos(root?: string): Promise<RepoCandidate[]> {
  const candidates = await scanCandidates(root);
  const projects = candidates.filter((c) => c.scope === "project");
  return Promise.all(projects.map(labelFor));
}
