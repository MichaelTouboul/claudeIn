import { exec } from "node:child_process";
import os from "node:os";

import { buildTransformPrompt, type TransformInput } from "./transform.prompt";

// One-shot transform timeout. Generous (transforms can be larger than a title)
// but bounded so a hung `claude` never leaves the renderer spinning forever.
const TRANSFORM_TIMEOUT_MS = 120_000;

// Upper bound on the prompt (content + instruction) written to the child stdin.
// Without it a very large tab — or a malicious renderer — could make the main
// process allocate and write an unbounded buffer. `maxBuffer` only caps stdout.
const MAX_PROMPT_BYTES = 2 * 1024 * 1024;

/**
 * Run a single, fully ISOLATED `claude --print` to transform one panel tab's
 * content per the user's instruction.
 *
 * Isolation guarantees (the transform must never touch the chat conversation):
 * - NO `--resume`, NO session id, NO `--output-format stream-json` — this is a
 *   fresh headless invocation that knows nothing about any live or stored chat.
 * - Runs in `os.tmpdir()` so it never writes a `.jsonl` transcript into a scanned
 *   project (same guard the title service uses).
 * - Nothing is persisted (no DB write, no broadcast). The result is returned to
 *   the caller and lands in place in the panel tab — that is the only effect.
 *
 * The prompt is built by the pure {@link buildTransformPrompt} helper and fed via
 * stdin (avoids shell-escaping the content). Resolves to the trimmed stdout, or
 * an empty string on failure so the renderer can simply no-op.
 */
export function transform(input: TransformInput): Promise<string> {
  const prompt = buildTransformPrompt(input);
  if (prompt.length > MAX_PROMPT_BYTES) return Promise.resolve("");
  return new Promise<string>((resolve) => {
    const proc = exec(
      "claude --print --max-turns 1",
      {
        timeout: TRANSFORM_TIMEOUT_MS,
        encoding: "utf-8",
        env: { ...process.env, FORCE_COLOR: "0" },
        cwd: os.tmpdir(),
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve("");
        } else {
          resolve(stdout.trim());
        }
      },
    );
    if (!proc.stdin) {
      // No stdin → the prompt would be silently dropped and claude would return
      // empty. Resolve explicitly so the empty result is intentional, not a
      // dropped write masquerading as a successful no-op.
      resolve("");
      return;
    }
    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}
