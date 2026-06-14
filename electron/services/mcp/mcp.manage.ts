/**
 * MCP manage (MCP-2) service — add / remove / edit / view-raw via the canonical
 * `claude mcp` CLI, on top of the read-only MCP-1 mirror.
 *
 * Mutations go through `claude mcp` (never hand-edited JSON): the CLI validates,
 * picks the right file per scope, and avoids cross-scope conflicts. Every value
 * is passed as a discrete spawn argv entry (via `buildMcpAddArgs`), never
 * concatenated into a shell string, so server commands/headers can't inject.
 *
 * The spawn seam is injectable (`setMcpCliRunner`) so tests can assert argv/cwd
 * and feed canned stdout/stderr/exit without ever invoking a real `claude`.
 */
import { spawn } from "node:child_process";
import { buildMcpAddArgs } from "./mcp.manage.args";
import { parseMcpGet } from "./mcp.manage.parse";
import type {
  McpAddInput,
  McpManageScope,
  McpMutationResult,
  McpServerRaw,
} from "../../types/mcp-manage.types";

/** A single `claude mcp …` invocation: discrete argv + the cwd it runs in. */
export interface McpCliInvocation {
  args: string[];
  cwd: string;
}

/** Captured outcome of a `claude mcp …` run. */
export interface McpCliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** The seam: run `claude` with the given argv/cwd and resolve its capture. */
export type McpCliRunner = (invocation: McpCliInvocation) => Promise<McpCliResult>;

// Default runner: spawn `claude` with discrete argv, capture stdout/stderr/exit.
// Same binary + subscription auth as the app's `--print` path. Tests swap this
// via `setMcpCliRunner`, so no real `claude` / network runs under test.
const defaultRunner: McpCliRunner = ({ args, cwd }) =>
  new Promise<McpCliResult>((resolve, reject) => {
    const proc = spawn("claude", args, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd,
      env: { ...process.env, FORCE_COLOR: "0" },
    });

    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });
  });

let runner: McpCliRunner = defaultRunner;

/** Swap the spawn seam (tests stub the `claude mcp` invocation). */
export function setMcpCliRunner(next: McpCliRunner): void {
  runner = next;
}

// project/local scope writes target a project-specific file, so the CLI must run
// with cwd = the project path; user scope is global and runs in the app cwd.
function resolveCwd(projectPath?: string): string {
  return projectPath ?? process.cwd();
}

/** Maps a captured CLI result to the `{ ok }` mutation union (stderr on failure). */
function toMutationResult(result: McpCliResult): McpMutationResult {
  if (result.exitCode === 0) return { ok: true };
  return { ok: false, error: result.stderr.trim() || "claude mcp exited non-zero" };
}

async function run(args: string[], projectPath?: string): Promise<McpCliResult> {
  return runner({ args, cwd: resolveCwd(projectPath) });
}

/** `claude mcp add …` (argv built per transport by `buildMcpAddArgs`). */
export async function addServer(input: McpAddInput): Promise<McpMutationResult> {
  const result = await run(buildMcpAddArgs(input), input.projectPath);
  return toMutationResult(result);
}

/** `claude mcp remove <name> --scope <scope>`. */
export async function removeServer(
  name: string,
  scope: McpManageScope,
  projectPath?: string,
): Promise<McpMutationResult> {
  const result = await run(["mcp", "remove", name, "--scope", scope], projectPath);
  return toMutationResult(result);
}

/**
 * Edit = remove then re-add (the CLI has no in-place edit). Runs the two calls
 * in order; if the remove fails the add is skipped and the remove error wins.
 */
export async function editServer(
  name: string,
  input: McpAddInput,
): Promise<McpMutationResult> {
  const removed = await removeServer(name, input.scope, input.projectPath);
  if (!removed.ok) return removed;
  return addServer(input);
}

/** `claude mcp get <name>` parsed into a typed `McpServerRaw`. Throws on failure. */
export async function getServerRaw(
  name: string,
  _scope?: McpManageScope,
  projectPath?: string,
): Promise<McpServerRaw> {
  const result = await run(["mcp", "get", name], projectPath);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || `claude mcp get ${name} exited non-zero`);
  }
  return parseMcpGet(name, result.stdout);
}
