import { spawn } from "node:child_process";

/** Arguments handed to the user-search spawn seam (mirrors `profile.service`). */
export type UserSearchRunnerArgs = {
  command: string;
  cwd: string;
  prompt: string;
};

/** The seam: run `claude --print` and resolve its captured stdout. */
export type UserSearchRunner = (args: UserSearchRunnerArgs) => Promise<string>;

export const USER_SEARCH_COMMAND = "claude --print";

// Default runner: spawn `claude --print` with cwd = the `.claude` path, feed the
// prompt on stdin, capture stdout. Subscription auth via `--print` (the app's
// existing LLM path). Tests swap this via `setUserSearchRunner` so no real
// `claude` / network is ever invoked.
const defaultRunner: UserSearchRunner = ({ cwd, prompt }) =>
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

let runner: UserSearchRunner = defaultRunner;

/** Swap the spawn seam (used by tests to stub the agentic run). */
export function setUserSearchRunner(next: UserSearchRunner): void {
  runner = next;
}

/** Run the current user-search runner. */
export function runUserSearch(args: UserSearchRunnerArgs): Promise<string> {
  return runner(args);
}
