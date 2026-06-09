# MCP Manage (MCP-2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. **Project note:** standard execution path is the lean dev-loop (`.claude/workflows/dev-loop.js`, invoked by `scriptPath`) — one run per phase, gate-verified, merged to `main`. Each Phase is a self-contained dev-loop input.

**Goal:** Add / remove / edit MCP servers and view a server's full raw config from inside ClaudeIn, by shelling out to the canonical `claude mcp` CLI, on top of the MCP-1 read-only view.

**Architecture:** A backend `mcp.manage` service wraps `claude mcp add/add-json/remove/get` via `spawn.service.ts` (no hand-edited JSON), exposed over IPC with a `{ ok }` result union, consumed by manage UI grafted onto MCP-1's `McpView` (expandable raw config, Add/Edit forms, Remove confirm, post-mutation "restart sessions" notice). No enable/disable (doesn't exist in Claude Code).

**Tech Stack:** Electron main (Node, child_process via existing spawn.service), TypeScript (no `any`), React renderer, Vitest. `@/` alias. 300-line hard limit. Spec: `docs/superpowers/specs/2026-06-09-mcp-manage-design.md`.

---

## File Structure

**Create (backend):**
- `electron/services/mcp.manage.ts` (+ `.test.ts`) — `getServerRaw`/`addServer`/`editServer`/`removeServer`.
- `electron/services/mcp.manage.args.ts` (+ `.test.ts`) — pure `buildMcpAddArgs`.
- Types in `electron/types/mcp-mirror.types.ts` (extend) or a new `electron/types/mcp-manage.types.ts`: `McpAddInput`, `McpServerRaw`, `McpMutationResult`.

**Create (renderer):** under `src/components/Workspace/DashboardArea/Dashboard/McpView/`
- `McpRawConfig.tsx` (+test) — renders a `McpServerRaw`.
- `McpAddDialog.tsx` (+test), `McpServerForm.tsx` (+test) — add/edit form (shared form, used for both).
- `mcpFormFields.ts` — transport→required-fields behavior map.
- `useMcpManage.ts` (hook, +test) — wraps the IPC calls + the refresh/restart-notice glue. (Place in `src/hooks/` if that matches the repo; else colocated.)

**Modify:**
- `electron/ipc/mcp.ipc.ts` — add 4 handlers.
- `electron/preload.ts`, `src/env.d.ts` — expose + declare the 4 methods.
- `src/components/.../McpView/McpServerRow.tsx` — expand affordance + Edit/Remove actions.
- `src/components/.../McpView/McpView.tsx` — header "Add MCP server" button + the restart-notice banner.

**Read for context before starting:**
- `electron/services/spawn.service.ts` — how `claude` is spawned + stdout/stderr/exit captured (the seam to reuse + stub).
- `electron/ipc/mcp.ipc.ts` + `electron/types/mcp-mirror.types.ts` — existing MCP IPC + types.
- MCP-1's `McpView/` components (shipped) — `McpServerRow`, `McpView`, `mcpPresentation`, the `_ui/Dialog` + `_ui/MarkdownBody` primitives.
- The spec's "Per-server shape" + CLI flags section.

**Types:**
```ts
type McpTransportInput = 'stdio' | 'http' | 'sse';
type McpAddInput = {
  name: string; scope: 'user' | 'project' | 'local'; projectPath?: string;
  transport: McpTransportInput;
  command?: string; args?: string[]; env?: Record<string, string>;   // stdio
  url?: string; headers?: Record<string, string>;                    // http/sse
};
type McpServerRaw = {
  name: string; transport: string; scope: string;
  command?: string; args?: string[]; env?: Record<string, string>;
  url?: string; headers?: Record<string, string>;
};
type McpMutationResult = { ok: true } | { ok: false; error: string };
```

---

## Phase 1 — Arg builder (`buildMcpAddArgs`, pure)

**Files:** Create `electron/services/mcp.manage.args.ts` (+ `.test.ts`); define the types above (in the chosen types file).

### Task 1.1

- [ ] **Step 1 — Failing tests** (`mcp.manage.args.test.ts`):
  - stdio input `{name:'pw', scope:'local', transport:'stdio', command:'npx', args:['-y','@playwright/mcp']}` → argv `['mcp','add','--scope','local','pw','--','npx','-y','@playwright/mcp']`;
  - stdio with `env:{API_KEY:'x'}` → includes `'--env','API_KEY=x'`;
  - http input `{name:'gh', scope:'user', transport:'http', url:'https://api/mcp', headers:{Authorization:'Bearer t'}}` → `['mcp','add','--scope','user','--transport','http','gh','https://api/mcp','--header','Authorization: Bearer t']`;
  - throws/returns an error for a missing transport-specific field (stdio without `command`; http without `url`) and for an empty/whitespace `name`.

> Confirm exact flag order/spelling against the spec's CLI section while implementing. The values must come back as **discrete argv entries** (never a concatenated shell string).

- [ ] **Step 2 — Run, verify fail.** `NODE_ENV=test npx vitest run electron/services/mcp.manage.args.test.ts` → FAIL.

- [ ] **Step 3 — Implement** `buildMcpAddArgs(input: McpAddInput): string[]` (pure; validates name + transport fields; builds argv per transport).

- [ ] **Step 4 — Run, verify pass.**

- [ ] **Step 5 — Gate + commit**

```bash
bash .claude/hooks/gate.sh
git add electron/services/mcp.manage.args.ts electron/services/mcp.manage.args.test.ts electron/types/
git commit -m "feat(mcp): buildMcpAddArgs — pure claude-mcp argv builder"
```

**Dev-loop input for Phase 1:** "Implement Phase 1 of docs/superpowers/plans/2026-06-09-mcp-manage.md: pure `buildMcpAddArgs(input: McpAddInput): string[]` in electron/services/mcp.manage.args.ts (+ the McpAddInput/McpServerRaw/McpMutationResult types). Build discrete argv (never a shell string) for `claude mcp add` per transport: stdio → `add --scope <s> <name> -- <command> <args...>` (+ `--env K=V` per env); http/sse → `add --scope <s> --transport <t> <name> <url> --header 'K: V'`. Validate name (non-empty, no whitespace) and transport-specific fields. Confirm flag spelling against the spec. Strict TDD (tests in the plan). NODE_ENV=test. CLAUDE.md + electron/CLAUDE.md (no any; named imports). Gate green."

---

## Phase 2 — Manage service (`mcp.manage` over stubbed spawn)

**Files:** Create `electron/services/mcp.manage.ts` (+ `.test.ts`).

### Task 2.1

- [ ] **Step 1 — Failing tests** (`mcp.manage.test.ts`), **stubbing the spawn seam** (assert argv + cwd, feed canned stdout/stderr/exit — no real `claude`):
  - `addServer(input)` spawns `claude` with `buildMcpAddArgs(input)`; a zero exit → `{ ok:true }`; a non-zero exit → `{ ok:false, error:<stderr> }`;
  - `removeServer('gh','user')` spawns `claude mcp remove gh --scope user`;
  - `editServer('gh', input)` performs `remove` then `add-json` (assert both calls, in order);
  - `getServerRaw('gh')` spawns `claude mcp get gh` and parses its output into `McpServerRaw` (feed a canned `get` output sample);
  - project/local scope passes the project path appropriately (cwd or flag — match what the CLI expects per the spec).

- [ ] **Step 2 — Run, verify fail.**

- [ ] **Step 3 — Implement** `mcp.manage.ts` using `spawn.service.ts` (reuse its `claude` invocation + stdout/stderr/exit capture; inject/stub it for tests). `addServer` uses `buildMcpAddArgs`; `editServer` = `removeServer` + an `add-json` call; `getServerRaw` parses `claude mcp get`. Each returns `McpMutationResult` (mutations) or the parsed raw (get). Keep < 300 lines.

- [ ] **Step 4 — Run, verify pass.**

- [ ] **Step 5 — Gate + commit**

```bash
bash .claude/hooks/gate.sh
git add electron/services/mcp.manage.ts electron/services/mcp.manage.test.ts
git commit -m "feat(mcp): mcp.manage — add/remove/edit/getRaw via claude mcp CLI"
```

**Dev-loop input for Phase 2:** "Implement Phase 2 of docs/superpowers/plans/2026-06-09-mcp-manage.md: electron/services/mcp.manage.ts with addServer/removeServer/editServer/getServerRaw, wrapping the `claude mcp` CLI via spawn.service.ts. addServer uses buildMcpAddArgs; editServer = remove then add-json; getServerRaw parses `claude mcp get`. Mutations return McpMutationResult ({ok:true} | {ok:false,error:stderr}) — non-zero exit → ok:false. STUB the spawn seam in tests (assert argv/cwd, feed canned stdout/stderr/exit — no real claude, deterministic). Tests per the plan. Strict TDD, NODE_ENV=test. CLAUDE.md + electron/CLAUDE.md (no any; 300-line limit). Gate green."

---

## Phase 3 — IPC + contract

**Files:** Modify `electron/ipc/mcp.ipc.ts`, `electron/preload.ts`, `src/env.d.ts`; mirror the manage types into `src/types/` if not already shared.

### Task 3.1

- [ ] **Step 1 — Failing test:** handlers `mcp:get-raw`, `mcp:add`, `mcp:edit`, `mcp:remove` delegate to `mcp.manage` and return the contract shapes (`McpServerRaw` / `McpMutationResult`). Test as the repo tests IPC.

- [ ] **Step 2 — Run, verify fail.**

- [ ] **Step 3 — Implement:** add the 4 handlers to `mcp.ipc.ts` (additive — keep the existing read handlers); expose `window.api.getMcpRaw` / `addMcpServer` / `editMcpServer` / `removeMcpServer` in `preload.ts` (match naming convention); declare in `src/env.d.ts` with the typed signatures + `{ ok }` result.

- [ ] **Step 4 — Run, verify pass.**

- [ ] **Step 5 — Gate + commit**

```bash
bash .claude/hooks/gate.sh
git add electron/ipc/mcp.ipc.ts electron/preload.ts src/env.d.ts src/types/
git commit -m "feat(mcp): IPC + window.api for get-raw/add/edit/remove"
```

**Dev-loop input for Phase 3:** "Implement Phase 3 of docs/superpowers/plans/2026-06-09-mcp-manage.md: extend electron/ipc/mcp.ipc.ts (additive) with mcp:get-raw, mcp:add, mcp:edit, mcp:remove delegating to mcp.manage; expose them on window.api in preload.ts (match naming); declare in src/env.d.ts (typed args + McpServerRaw/McpMutationResult returns); ensure the manage types are shared into src/types/. Test IPC as the repo does. Strict TDD; CLAUDE.md + electron/CLAUDE.md (no any; import type). Gate green."

---

## Phase 4 — View raw + remove (renderer)

**Files:** Create `McpRawConfig.tsx` (+test), `useMcpManage.ts` (+test); modify `McpServerRow.tsx`, `McpView.tsx`.

### Task 4.1: `useMcpManage` + restart notice state

- [ ] **Step 1 — Failing test:** `useMcpManage` exposes `getRaw(name,scope)`, `remove(name,scope)`, and a `needsRestart` flag set true after a successful mutation; a failed mutation exposes the error. Stub `window.api`.
- [ ] **Step 2–4** — implement the hook wrapping the IPC. **Step 5 — commit.**

### Task 4.2: Expandable raw config + Remove

- [ ] **Step 1 — Failing tests:** `McpServerRow` shows an expand control → on expand fetches `getRaw` and renders `McpRawConfig` (command/args/env or url/headers); a Remove action opens a confirm (`_ui/Dialog`) → on confirm calls `remove`; `McpView` shows the restart-notice banner when `needsRestart`. Stub `window.api`; accessible names.
- [ ] **Step 2–4** — implement `McpRawConfig` (read-only block), the row expand + Remove (confirm), and the `McpView` banner. < 300 lines each. **Step 5 — Gate + commit.**

```bash
bash .claude/hooks/gate.sh
```

**Dev-loop input for Phase 4:** "Implement Phase 4 of docs/superpowers/plans/2026-06-09-mcp-manage.md: useMcpManage hook (getRaw/remove + needsRestart flag set after a successful mutation + error surfacing, wrapping the IPC); McpRawConfig.tsx (read-only render of McpServerRaw — command/args/env or url/headers); extend McpServerRow with an expand affordance that fetches+shows raw config and a Remove action behind an _ui/Dialog confirm; show a 'Restart your Claude sessions to apply' banner in McpView when needsRestart. Stub window.api in tests; accessible names. Strict TDD; CLAUDE.md + src/CLAUDE.md + aria-requirements (no any; enum/behavior maps; 300-line limit; design-system CSS vars). Gate green."

---

## Phase 5 — Add / edit forms (renderer)

**Files:** Create `McpServerForm.tsx` (+test), `McpAddDialog.tsx` (+test), `mcpFormFields.ts`; modify `McpView.tsx` (header "Add" button) and `McpServerRow.tsx` (Edit action opens the form prefilled).

### Task 5.1: `mcpFormFields` behavior map

- [ ] **Step 1 — Failing test:** `Record<McpTransportInput, {required: string[]; ...}>` — stdio requires `command`; http/sse require `url`; every transport has an entry (no chain).
- [ ] **Step 2–4 · 5 — commit.**

### Task 5.2: `McpServerForm` + `McpAddDialog`, Add + Edit wiring

- [ ] **Step 1 — Failing tests:** the form renders name + scope (user/project/local) + transport (stdio/http/sse) and the transport-specific fields driven by `mcpFormFields`; submitting Add calls `addMcpServer` with the right `McpAddInput`; opening Edit on a row prefills from `getRaw` and submits via `editMcpServer`; an "Add MCP server" button in `McpView` opens the dialog; a failed mutation shows the CLI error, a success closes + triggers the restart notice. Stub `window.api`; accessible form (labels, dialog role).
- [ ] **Step 2–4** — implement the shared `McpServerForm` (used by Add and Edit), `McpAddDialog` (`_ui/Dialog` wrapper), and wire the entry points. < 300 lines each. **Step 5 — Gate + commit.**

```bash
bash .claude/hooks/gate.sh
```

**Dev-loop input for Phase 5:** "Implement Phase 5 of docs/superpowers/plans/2026-06-09-mcp-manage.md: mcpFormFields.ts (Record<McpTransportInput,{required:string[]}> — stdio→command, http/sse→url; every transport has an entry, no chain); McpServerForm.tsx (name + scope user/project/local + transport + transport-specific fields driven by mcpFormFields); McpAddDialog.tsx (_ui/Dialog wrapper); an 'Add MCP server' button in McpView opening it; an Edit action on McpServerRow that prefills from getRaw and submits editMcpServer; Add submits addMcpServer with the right McpAddInput. Failed mutation → show CLI error; success → close + restart notice. Stub window.api; accessible form/dialog. Strict TDD; CLAUDE.md + src/CLAUDE.md + aria-requirements (no any; behavior maps; 300-line limit; design-system CSS vars; explicit ternaries). Gate green."

---

## Self-Review

**Spec coverage:**
- Mutations via `claude mcp` CLI (not JSON edits) → Phases 1–2 (`buildMcpAddArgs` + `mcp.manage` over spawn). ✓
- View raw config (deferred from MCP-1) → Phase 4 (`getServerRaw` + `McpRawConfig`). ✓
- Add → Phase 5; Edit (= remove + add-json) → Phase 2 (`editServer`) + Phase 5 (form); Remove (confirm) → Phase 4. ✓
- No enable/disable toggle → not present anywhere. ✓
- Scopes user/project/local → `McpAddInput.scope` threaded through builder/service/form. ✓
- stdio + http/sse shapes, `${VAR}` passes through as literal text → builder/form. ✓
- Restart notice after mutation (no live reload) → Phase 4 (`needsRestart` banner). ✓
- CLI errors surfaced not thrown → `McpMutationResult` `{ ok }` union across phases. ✓
- argv safety (no shell concatenation) → Phase 1 (discrete argv) + Phase 2 (spawn argv). ✓
- Out of scope (OAuth/ws, trust-reset, desktop-import, status/tools) → not planned. ✓

**Placeholder scan:** Backend phases carry concrete argv/signatures; renderer/IPC phases describe components/handlers behaviorally with exact paths, the typed contract, and dev-loop inputs (the repo's spawn-stub/IPC-test/_ui idioms read at execution time). Error/empty/restart states each called out. All types (`McpAddInput`, `McpServerRaw`, `McpMutationResult`, `McpTransportInput`) defined up front.

**Type consistency:** `McpAddInput`, `McpServerRaw`, `McpMutationResult`, `McpTransportInput`, `buildMcpAddArgs`, `addServer`/`removeServer`/`editServer`/`getServerRaw`, the four IPC channels, `useMcpManage`, `mcpFormFields`, `McpServerForm`/`McpAddDialog`/`McpRawConfig` are used identically across phases.
