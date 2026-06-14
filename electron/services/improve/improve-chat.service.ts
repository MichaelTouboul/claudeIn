import { spawn } from "node:child_process";
import os from "node:os";

import { buildImproveChatPrompt } from "./improve-chat.prompt";
import type { ImproveChatInput } from "../../types/improve.types";

/**
 * Self-Improve loop — scoping-chat engine (I4).
 *
 * One `improveChat` call = one turn of the modal's scoping dialogue. It builds a
 * system prompt (see `improve-chat.prompt`) seeded with the request type +
 * component context (name, sourcePath, and the source file contents read from
 * disk) and runs `claude --print` (the app's subscription path — no Agent-SDK /
 * API-key migration). Discussion only: the prompt forbids tool use.
 *
 * The spawn is behind a swappable runner seam (mirroring `profile.service`'s
 * `setProfileRunner`) so tests stub it — no real `claude`/network is invoked.
 */

/** Arguments handed to the spawn seam — asserted by tests, used by the runner. */
export type ImproveChatRunnerArgs = {
  /** Full command line for the spawn (e.g. `claude --print`). */
  command: string;
  /** Working directory the run executes in (a tmp dir — no tool use anyway). */
  cwd: string;
  /** The scoping prompt fed to the agent on stdin. */
  prompt: string;
};

/** The seam: run a `claude --print` turn and resolve its captured stdout. */
export type ImproveChatRunner = (args: ImproveChatRunnerArgs) => Promise<string>;

export type { ImproveChatInput };

const CHAT_COMMAND = "claude --print";

// Default runner: spawn `claude --print` in a tmp dir (the scoping chat never
// touches a project — no tool use), feed the prompt on stdin, capture stdout.
// Tests swap this via `setImproveChatRunner`.
const defaultRunner: ImproveChatRunner = ({ cwd, prompt }) =>
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

let runner: ImproveChatRunner = defaultRunner;

/** Swap the spawn seam (used by tests to stub the agentic run). */
export function setImproveChatRunner(next: ImproveChatRunner): void {
  runner = next;
}

/**
 * Run one scoping-chat turn and return the assistant's next reply string.
 * Builds the prompt (with component context + on-disk source contents) and runs
 * the `claude --print` seam.
 */
export async function improveChat(input: ImproveChatInput): Promise<string> {
  const prompt = buildImproveChatPrompt(input);
  return runner({ command: CHAT_COMMAND, cwd: os.tmpdir(), prompt });
}
