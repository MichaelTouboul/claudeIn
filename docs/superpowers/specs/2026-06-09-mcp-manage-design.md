# MCP Manage (MCP-2) — Design

**Date:** 2026-06-09
**Status:** Approved (brainstorm decomposition) → ready for review → implementation plan
**Scope:** Backend (mutations via the `claude mcp` CLI + raw-config read) + renderer (manage UI on top of the MCP-1 view).

## What this is

The second slice of MCP integration: let the user **add / remove / edit** MCP servers and **view a server's full raw config**, from inside ClaudeIn. Builds directly on **MCP-1** (the read-only `McpView` list).

This is **MCP-2** of the agreed roadmap: MCP-1 visualize (done) → **MCP-2 manage/edit** (this) → MCP-3 live client (C+D).

## Key correction from research (claude-code-guide)

Confirmed against current Claude Code docs — these reshape the feature versus the original roadmap bullet:

- **Mutations go through the `claude mcp` CLI**, not by hand-editing JSON. The CLI is the canonical, safe path: it validates, picks the right file per scope, and avoids cross-scope/file conflicts. The app already shells out to `claude` (for `--print`), so this reuses `spawn.service.ts`.
- **There is NO per-server enable/disable toggle.** You cannot disable a server without removing it. So MCP-2 has **no toggle** — the operations are **add / remove / edit / view-raw**. (Project-scoped `.mcp.json` servers have a one-time *trust approval* and `claude mcp reset-project-choices`; surfacing that is **out of scope** for v1.)
- **No live reload.** `claude mcp` writes take effect only on the next Claude Code session start. After any mutation the UI must tell the user **running sessions need a restart**.
- **Scopes & write targets** (CLI `--scope`): `user` → `~/.claude.json` top-level `mcpServers`; `project` → `<project>/.mcp.json`; `local` → `~/.claude.json` `projects[<path>].mcpServers`.
- **Per-server shape:** stdio `{ type:'stdio', command, args, env }`; http/sse `{ type:'http'|'sse', url, headers }`. `${VAR}` / `${VAR:-default}` interpolation is supported. (WebSocket and OAuth-managed servers exist but are **out of scope** for v1 add/edit — see below.)

## Operations (v1)

1. **View raw config** — expand a server in `McpView` to see its full config (command/args/env or url/headers). Read via `claude mcp get <name>` (authoritative) — this is the "raw detail" MCP-1 deferred to B.
2. **Add** — a form (name, scope, transport, then transport-specific fields) → `claude mcp add` / `claude mcp add-json`.
3. **Edit** — load current config (`get`), let the user modify, apply as `remove` + `add-json` (explicit overwrite; `claude mcp` has no in-place edit).
4. **Remove** — `claude mcp remove <name> --scope <scope>`, with a confirm.

After any of 2–4: refresh the MCP-1 list (re-read the mirror / `claude mcp list`) and show a **"restart Claude sessions to apply"** notice.

## Architecture

### Backend — `electron/`

**`electron/services/mcp.manage.ts` (create)** — wraps the `claude mcp` CLI via `spawn.service.ts` (same binary/auth as `--print`). Functions, each returning a typed result and surfacing CLI stderr on failure:
- `getServerRaw(name, scope?, projectPath?): Promise<McpServerRaw>` — `claude mcp get <name>` parsed into a typed raw config.
- `addServer(input: McpAddInput): Promise<void>` — builds `claude mcp add`/`add-json` args from `input` (scope, transport, command/args/env or url/headers).
- `editServer(name, input): Promise<void>` — `remove` then `add-json`.
- `removeServer(name, scope, projectPath?): Promise<void>` — `claude mcp remove`.
- A small pure `buildMcpAddArgs(input)` helper (+ its own test) so arg construction is unit-testable without spawning.

```ts
type McpTransportInput = 'stdio' | 'http' | 'sse';
type McpAddInput = {
  name: string;
  scope: 'user' | 'project' | 'local';
  projectPath?: string;            // required for project/local
  transport: McpTransportInput;
  // stdio:
  command?: string; args?: string[]; env?: Record<string, string>;
  // http/sse:
  url?: string; headers?: Record<string, string>;
};
type McpServerRaw = {                // parsed from `claude mcp get`
  name: string; transport: string; scope: string;
  command?: string; args?: string[]; env?: Record<string, string>;
  url?: string; headers?: Record<string, string>;
};
```

**Safety:** all values are passed as discrete `spawn` argv (never string-concatenated into a shell), so server commands/args/headers can't shell-inject. Validate `name` (non-empty, no whitespace) and require the transport-specific fields before invoking.

**IPC — `electron/ipc/mcp.ipc.ts` (extend the existing file)**, additive:
- `mcp:get-raw` (name, scope?, projectPath?) → `McpServerRaw`
- `mcp:add` (McpAddInput) → `{ ok: true } | { ok: false; error: string }`
- `mcp:edit` (name, McpAddInput) → same result shape
- `mcp:remove` (name, scope, projectPath?) → same result shape

Add the `window.api` methods (`preload.ts`) + declarations (`src/env.d.ts`). Result type is a discriminated `{ ok }` union so the renderer renders CLI errors instead of throwing.

### Renderer — `src/` (extend MCP-1's `McpView`)

- **`McpServerRow`** gains an **expand** affordance → fetches `mcp:get-raw` and shows the raw config (reuse a code/`MarkdownBody`-style block), plus **Edit** and **Remove** actions (Remove behind a confirm dialog — reuse `_ui/Dialog`).
- **`McpAddDialog` / `McpEditForm`** — a form: name, scope (user/project/local), transport (stdio/http/sse via an enum→fields behavior map), then the transport-specific fields (command+args+env, or url+headers). Submits to `mcp:add` / `mcp:edit`.
- **Add entry point** — an "Add MCP server" button in `McpView`'s header.
- **Restart notice** — after a successful mutation, a non-blocking banner: "Restart your Claude sessions to apply." (`_ui` banner/toast pattern.)
- After a mutation, the existing live mirror (`onMcpChanged`) should refresh the list automatically once the file changes; if not reliably, re-fetch via `getMcp`.

## State modeling (CLAUDE.md compliance)

- `McpTransportInput` is an inline union; the transport→form-fields mapping and the mutation result are modeled as `Record`/discriminated unions, not fallback chains.
- No `any`; named imports; `import type`; `@/` alias; 300-line limit (split the dialog/form/raw-view; split `mcp.manage` arg-building into the helper); design-system CSS vars; explicit ternaries; accessible dialog/form (aria-requirements).

## Testing

- **`buildMcpAddArgs`** (pure) — stdio input → correct `add ... -- <command> <args>` argv with `--env`/`--scope`; http input → `add --transport http --header ...`; rejects missing transport-specific fields.
- **`mcp.manage`** — each function invokes the `claude mcp` CLI with the expected argv (STUB the spawn seam — assert argv, feed canned stdout/stderr; no real CLI); `getServerRaw` parses `claude mcp get` output into `McpServerRaw`; a non-zero CLI exit surfaces as `{ ok:false, error }`.
- **IPC** — handlers delegate to the service and return the `{ ok }` union.
- **Renderer** — expanding a row fetches+renders raw config; the Add form submits the right `McpAddInput`; Remove asks for confirmation then calls `mcp:remove`; a failed mutation shows the CLI error; a success shows the restart notice.

Gate: `bash .claude/hooks/gate.sh` (backend tests NODE_ENV=test; spawn stubbed — no network, deterministic).

## Out of scope (v1)

- **Enable/disable toggle** — does not exist in Claude Code (would be remove/re-add).
- **OAuth-managed servers** (the `add` OAuth/browser flow, `--client-id/secret`, `headersHelper`) and **WebSocket (`ws`)** transport — add/edit limited to stdio + http/sse with static headers in v1.
- **Project trust approval / `reset-project-choices`** surfacing.
- **`add-from-claude-desktop`** import.
- Live connection/auth **status** and **tool listing** — that's **MCP-3 (C+D)**.

## Suggested build sequence

1. **Arg builder** — `buildMcpAddArgs` pure helper. (TDD)
2. **Manage service** — `mcp.manage.ts` (`getServerRaw`/`addServer`/`editServer`/`removeServer`) over stubbed spawn. (TDD)
3. **IPC + contract** — extend `mcp.ipc.ts`, `preload.ts`, `env.d.ts` with the four channels + `{ ok }` result. (TDD)
4. **View raw + remove** — `McpServerRow` expand → raw config, Remove (confirm) + restart notice. (TDD)
5. **Add / edit forms** — `McpAddDialog`/`McpEditForm` + header "Add" entry. (TDD)

Each step is gate-verified and committed independently.
