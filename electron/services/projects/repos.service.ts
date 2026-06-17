import { spawn } from "node:child_process";
import os from "node:os";

import { scanCandidates } from "../system/onboarding.service";
import { detectRepoLanguage } from "./repo-language";
import { detectRepoLogo } from "./repo-logo";
import { buildRepoLabelContext } from "./repo-context";
import { renderPrompt, repoLabelPrompt } from "../prompts";
import type { Candidate } from "../../types/onboarding.types";
import type { RepoCandidate } from "../../types/user.type";

/**
 * Repo discovery for the Home page: reuse the bounded FS scan
 * (`onboarding.service.scanCandidates`), keep only `scope = project` repos,
 * deterministically detect a per-repo logo (`detectRepoLogo`, no LLM), and attach
 * a short per-repo LLM label via the runner seam. The seam is stubbed in tests so
 * no real `claude` / network is invoked; a runner failure degrades to a `null`
 * label rather than failing the whole scan.
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

async function labelFor(candidate: Candidate): Promise<RepoCandidate> {
  const logoDataUrl = detectRepoLogo(candidate.path);
  const language = detectRepoLanguage(candidate.path);
  // Gather the repo context in Node and run the label LLM in a throwaway tmp cwd
  // (NEVER the repo) so it can't leak a `.jsonl` transcript into a scanned project.
  const context = buildRepoLabelContext(candidate.path);
  try {
    const label = await runner({
      command: REPOS_COMMAND,
      cwd: os.tmpdir(),
      prompt: renderPrompt(repoLabelPrompt, { context }),
    });
    return { ...candidate, label: label.length > 0 ? label : null, logoDataUrl, language };
  } catch {
    return { ...candidate, label: null, logoDataUrl, language };
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
