# Claude Code & Claude Desktop — Exhaustive Feature Audit

> **Purpose:** product-roadmap reference. Completeness over depth. Every entry is traceable to an official documentation page (URL cited per section or per feature).
>
> **Date:** 2026-06-02
>
> **Doc sites used as source of truth:**
> - `https://code.claude.com/docs/...` (Claude Code product docs — primary source; `platform.claude.com/docs/...` 307-redirects here)
> - `https://support.claude.com/...` (Claude Help Center — desktop/Cowork/connectors; accessed via search excerpts, see "Sourcing gaps")
> - `https://claude.com/docs/...` (Cowork extensions — accessed via search excerpts, see "Sourcing gaps")
>
> **Note on naming:** Anthropic uses "Claude Code Desktop" / the **Code tab** of the Claude Desktop app for software development, plus **Chat** and **Cowork** tabs. "Claude Code" also exists as a CLI, IDE extensions, web/cloud, and SDK. This audit covers all surfaces.

---

## How to read this audit

Each feature: **bold name** + 1–2 sentence description + source URL. Where docs gave an explicit list (all slash commands, all hook events, all permission modes, all keyboard shortcuts), every item is enumerated. Items marked `(beta)`, `(research preview)`, or `(unconfirmed)` were flagged as such in docs or could not be fully confirmed.

---

## 1. Claude Code CLI — invocation & core commands

Source: https://code.claude.com/docs/en/cli-reference

- **`claude`** — Start an interactive session in the current directory.
- **`claude "query"`** — Start an interactive session with an initial prompt.
- **`claude -p "query"` / `--print`** — Headless/SDK mode: run the query, print the result, and exit (for scripting and pipelines). https://code.claude.com/docs/en/headless
- **`cat file | claude -p "query"`** — Pipe content into Claude in print mode.
- **`claude -c` / `--continue`** — Continue the most recent conversation in the current directory.
- **`claude -r "<session>" "query"` / `--resume`** — Resume a session by ID or name, or open an interactive picker.
- **`claude update`** — Update Claude Code to the latest version.
- **`claude install [version]`** — Install/reinstall the native binary (accepts a version, `stable`, or `latest`).
- **`claude auth login` / `logout` / `status`** — Sign in/out of your Anthropic account; print auth status as JSON. Flags: `--email`, `--sso`, `--console`.
- **`claude agents`** — Open agent view to monitor and dispatch parallel background sessions (`--cwd`, `--json`, `--permission-mode`, `--model`, `--effort`, `--agent`).
- **`claude attach <id>`** — Attach to a background session in the current terminal.
- **`claude auto-mode defaults` / `config`** — Print the auto-mode classifier rules / effective config as JSON.
- **`claude daemon status` / `daemon stop --any`** — Inspect/stop the background-session supervisor process.
- **`claude logs <id>`** — Print recent output from a background session.
- **`claude mcp`** — Configure MCP servers (subcommands below).
- **`claude plugin` / `claude plugins`** — Manage plugins (install/marketplace subcommands).
- **`claude project purge [path]`** — Delete all local Claude Code state for a project (transcripts, tasks, logs, edit history). Flags: `--dry-run`, `-y`, `-i`, `--all`.
- **`claude remote-control`** — Start a Remote Control server (no local interactive session). https://code.claude.com/docs/en/remote-control
- **`claude respawn <id>`** — Restart a background session (running or stopped) with conversation intact; `--all`.
- **`claude rm <id>`** — Remove a background session from the list (keeps local transcript).
- **`claude setup-token`** — Generate a long-lived OAuth token for CI/scripts (prints, does not save). https://code.claude.com/docs/en/authentication
- **`claude stop <id>` / `claude kill`** — Stop a background session.
- **`claude ultrareview [target]`** — Run a deep cloud multi-agent review non-interactively (`--json`, `--timeout`).
- **`claude mcp serve`** — Run Claude Code itself as a stdio MCP server other apps can connect to. https://code.claude.com/docs/en/mcp

---

## 2. Claude Code CLI — flags

Source: https://code.claude.com/docs/en/cli-reference

### Session / context
- **`--add-dir`** — Add additional working directories for file read/edit.
- **`--continue` / `-c`**, **`--resume` / `-r`**, **`--fork-session`** — Continue, resume, or fork a session into a new ID.
- **`--session-id`** — Use a specific UUID for the session.
- **`--name` / `-n`** — Set a display name for the session.
- **`--from-pr`** — Resume sessions linked to a PR (GitHub/GitLab/Bitbucket URL or number).
- **`--no-session-persistence`** — Don't save the session to disk (print mode).

### Model / reasoning
- **`--model`** — Set the model (alias `sonnet`/`opus`/`haiku` or full name).
- **`--effort`** — Set effort level (`low`/`medium`/`high`/`xhigh`/`max`) for the session.
- **`--fallback-model`** — Auto-fallback model when default is overloaded (print/background).
- **`--betas`** — Beta headers for API requests (API-key users).

### Permissions / tools
- **`--permission-mode`** — Start in `default`/`acceptEdits`/`plan`/`auto`/`dontAsk`/`bypassPermissions`.
- **`--dangerously-skip-permissions`** — Skip permission prompts (= `bypassPermissions`).
- **`--allow-dangerously-skip-permissions`** — Add bypass to the Shift+Tab cycle without starting in it.
- **`--allowedTools` / `--disallowedTools`** — Allow/deny tool rules.
- **`--tools`** — Restrict which built-in tools are available.
- **`--permission-prompt-tool`** — MCP tool to handle permission prompts non-interactively.
- **`--sandbox`** (see `/sandbox`) — Sandbox mode. https://code.claude.com/docs/en/sandboxing

### System prompt
- **`--system-prompt`**, **`--system-prompt-file`** — Replace the entire system prompt.
- **`--append-system-prompt`**, **`--append-system-prompt-file`** — Append to the default prompt.
- **`--exclude-dynamic-system-prompt-sections`** — Move per-machine sections out of the prompt for better cache reuse.

### Headless / output (print mode)
- **`--output-format`** (`text`/`json`/`stream-json`), **`--input-format`** (`text`/`stream-json`).
- **`--include-partial-messages`**, **`--include-hook-events`**, **`--replay-user-messages`**, **`--prompt-suggestions`**.
- **`--json-schema`** — Validated JSON output matching a schema.
- **`--max-turns`**, **`--max-budget-usd`** — Cap turns / dollar spend.
- **`--verbose`** — Full turn-by-turn output.

### Worktrees / parallelism
- **`--worktree` / `-w`** — Start in an isolated git worktree (`#<PR>` or PR URL supported). https://code.claude.com/docs/en/worktrees
- **`--tmux` / `--tmux=classic`** — tmux session for the worktree.
- **`--bg`**, **`--exec`** — Start session/shell command as a background job.
- **`--teammate-mode`** (`auto`/`in-process`/`tmux`) — Agent-team display mode. https://code.claude.com/docs/en/agent-teams

### MCP / plugins / settings
- **`--mcp-config`**, **`--strict-mcp-config`** — Load/restrict MCP servers from JSON.
- **`--plugin-dir`**, **`--plugin-url`** — Load plugins from a dir/zip/URL for the session.
- **`--settings`**, **`--setting-sources`** — Override settings / restrict which setting sources load.
- **`--agent`**, **`--agents`** — Run as a named subagent / define subagents inline via JSON.

### Integrations / environment
- **`--ide`** — Auto-connect to a single available IDE.
- **`--chrome` / `--no-chrome`** — Chrome browser integration. https://code.claude.com/docs/en/chrome
- **`--channels`** (research preview), **`--dangerously-load-development-channels`** — MCP channel notifications. https://code.claude.com/docs/en/channels
- **`--remote`** — Create a new cloud web session. **`--teleport`** — Resume a web session locally.
- **`--remote-control` / `--rc`**, **`--remote-control-session-name-prefix`** — Remote Control session.
- **`--bare`** — Minimal mode: skip auto-discovery of hooks/skills/plugins/MCP/memory for fast scripted startup.
- **`--disable-slash-commands`** — Disable all skills/commands for the session.
- **`--debug`**, **`--debug-file`** — Debug logging.
- **`--version` / `-v`**, **`--help`**.
- **`--init`**, **`--init-only`**, **`--maintenance`** — Run Setup/SessionStart hooks (see Hooks §11).
- **`--setup-bedrock` / `--setup-vertex`** wizards (via slash commands; provider flags `CLAUDE_CODE_USE_BEDROCK/VERTEX/FOUNDRY`).

---

## 3. Slash commands (in-session) — complete enumeration

Source: https://code.claude.com/docs/en/commands · Two special types are marked **[Skill]** (a bundled skill Claude can also auto-invoke) or **[Workflow]** (a bundled dynamic workflow that fans out across subagents in the background). Availability varies by platform/plan/environment.

- **`/add-dir <path>`** — Add a working directory for file access during the session.
- **`/agents`** — Manage subagent configurations.
- **`/autofix-pr [prompt]`** — Spawn a web session that watches the branch's PR and pushes fixes on CI failure / review comments.
- **`/background [prompt]` (alias `/bg`)** — Detach the session to run as a background agent.
- **`/batch <instruction>` [Skill]** — Orchestrate large-scale changes in parallel: decompose into 5–30 units, one background subagent per unit in its own worktree, each opens a PR.
- **`/branch [name]` (alias `/fork`)** — Branch the conversation at this point.
- **`/btw <question>`** — Ask a quick side question without adding to history.
- **`/chrome`** — Configure Claude in Chrome settings.
- **`/claude-api [migrate|managed-agents-onboard]` [Skill]** — Load Claude API reference for your language; migrate model versions; onboard a Managed Agent.
- **`/clear [name]` (aliases `/reset`, `/new`)** — Start a new conversation with empty context.
- **`/code-review [low|medium|high|xhigh|max|ultra] [--fix] [--comment] [target]` [Skill]** — Review diff for bugs + cleanups; `ultra` runs a cloud review.
- **`/color [color|default]`** — Set the prompt-bar color.
- **`/compact [instructions]`** — Summarize the conversation to free context.
- **`/config` (alias `/settings`)** — Open Settings UI (theme, model, output style, etc.).
- **`/context [all]`** — Visualize context-window usage as a colored grid.
- **`/copy [N]`** — Copy the last (or Nth-latest) assistant response.
- **`/cost`** — Alias for `/usage`.
- **`/debug [description]` [Skill]** — Enable debug logging and troubleshoot from the debug log.
- **`/deep-research <question>` [Workflow]** — Fan out web searches, cross-check sources, synthesize a cited report.
- **`/desktop` (alias `/app`)** — Continue the current CLI session in the Claude Code Desktop app (macOS/Windows, subscription).
- **`/diff`** — Interactive diff viewer (uncommitted changes + per-turn diffs).
- **`/doctor`** — Diagnose/verify installation and settings.
- **`/effort [level|auto]`** — Set model effort level (`low`/`medium`/`high`/`xhigh`/`max`/`ultracode`).
- **`/exit` (alias `/quit`)** — Exit the CLI (detaches a background session).
- **`/export [filename]`** — Export the conversation as plain text.
- **`/fast [on|off]`** — Toggle fast mode. https://code.claude.com/docs/en/fast-mode
- **`/feedback [report]` (aliases `/bug`, `/share`)** — Submit feedback / report a bug / share conversation.
- **`/fewer-permission-prompts` [Skill]** — Scan transcripts and add a read-only allowlist to project settings.
- **`/focus`** — Toggle focus view (fullscreen only).
- **`/goal [condition|clear]`** — Set a goal Claude keeps working toward across turns. https://code.claude.com/docs/en/goal
- **`/heapdump`** — Write a JS heap snapshot for diagnosing memory usage.
- **`/help`** — Show help and available commands.
- **`/hooks`** — View hook configurations for tool events.
- **`/ide`** — Manage IDE integrations and show status.
- **`/init`** — Initialize the project with a `CLAUDE.md` (interactive flow with `CLAUDE_CODE_NEW_INIT=1`).
- **`/insights`** — Report analyzing your sessions (project areas, patterns, friction points).
- **`/install-github-app`** — Set up the Claude GitHub Actions app for a repo.
- **`/install-slack-app`** — Install the Claude Slack app via OAuth.
- **`/keybindings`** — Open/create your keybindings config. https://code.claude.com/docs/en/keybindings
- **`/login` / `/logout`** — Sign in / out of your Anthropic account.
- **`/loop [interval] [prompt]` [Skill] (alias `/proactive`)** — Run a prompt repeatedly while the session is open. https://code.claude.com/docs/en/scheduled-tasks
- **`/mcp`** — Manage MCP server connections and OAuth.
- **`/memory`** — Edit CLAUDE.md memory files, toggle auto-memory, view entries.
- **`/mobile` (aliases `/ios`, `/android`)** — QR code to download the Claude mobile app.
- **`/model [model]`** — Switch model (and save as default for new sessions).
- **`/passes`** — Share a free week of Claude Code (if eligible).
- **`/permissions` (alias `/allowed-tools`)** — Manage allow/ask/deny rules and review auto-mode denials.
- **`/plan [description]`** — Enter plan mode directly.
- **`/plugin`** — Manage plugins.
- **`/powerup`** — Discover features through interactive lessons.
- **`/pr-comments [PR]`** — (Removed in v2.1.91) Fetch PR comments.
- **`/privacy-settings`** — View/update privacy settings (Pro/Max).
- **`/radio`** — Open Claude FM lo-fi radio.
- **`/recap`** — One-line summary of the current session on demand.
- **`/release-notes`** — View the changelog in a version picker.
- **`/reload-plugins`** — Reload active plugins without restarting.
- **`/reload-skills`** — Re-scan skill/command directories without restarting.
- **`/remote-control` (alias `/rc`)** — Make the session available for Remote Control from claude.ai.
- **`/remote-env`** — Configure the default remote environment for web sessions.
- **`/rename [name]`** — Rename the current session.
- **`/resume [session]` (alias `/continue`)** — Resume a conversation by ID/name or via picker.
- **`/review [PR]`** — Review a PR locally.
- **`/rewind` (aliases `/checkpoint`, `/undo`)** — Rewind code and/or conversation to a checkpoint, or summarize.
- **`/run` [Skill]** — Launch and drive your app to verify a change live (v2.1.145+).
- **`/run-skill-generator` [Skill]** — Write a per-project skill teaching `/run` and `/verify` how to launch the app.
- **`/sandbox`** — Toggle sandbox mode.
- **`/schedule [description]` (alias `/routines`)** — Create/update/list/run routines (cloud cron). https://code.claude.com/docs/en/routines
- **`/scroll-speed`** — Adjust mouse-wheel scroll speed (fullscreen).
- **`/security-review`** — Analyze pending changes for security vulnerabilities.
- **`/setup-bedrock` / `/setup-vertex`** — Provider auth wizards (visible only when the provider env var is set).
- **`/simplify [target]` [Skill]** — Cleanup-only review (reuse/simplification/efficiency/abstraction) that applies fixes (v2.1.154+).
- **`/skills`** — List available skills (sort by token count; hide a skill).
- **`/stats`** — Alias for `/usage` (opens Stats tab).
- **`/status`** — Settings UI Status tab (version, model, account, connectivity).
- **`/statusline`** — Configure the status line. https://code.claude.com/docs/en/statusline
- **`/stickers`** — Order Claude Code stickers.
- **`/stop`** — Stop the current background session (when attached).
- **`/tasks` (alias `/bashes`)** — List and manage background tasks.
- **`/team-onboarding`** — Generate a team onboarding guide from your usage history.
- **`/teleport` (alias `/tp`)** — Pull a web session into this terminal.
- **`/terminal-setup`** — Configure terminal keybindings (Shift+Enter, etc.).
- **`/theme`** — Change color theme (auto/light/dark, daltonized, ANSI, custom). https://code.claude.com/docs/en/terminal-config
- **`/tui [default|fullscreen]`** — Set the terminal UI renderer. https://code.claude.com/docs/en/fullscreen
- **`/ultraplan <prompt>`** — Draft a plan in a cloud session, review in browser, execute remotely or locally. https://code.claude.com/docs/en/ultraplan
- **`/ultrareview [PR]`** — Deep multi-agent cloud review (preferred as `/code-review ultra`). https://code.claude.com/docs/en/ultrareview
- **`/upgrade`** — Open the upgrade page (Pro/Max).
- **`/usage`** — Session cost, plan limits, activity stats (breakdown by skill/subagent/plugin/MCP). https://code.claude.com/docs/en/costs
- **`/usage-credits`** — Configure usage credits (formerly `/extra-usage`).
- **`/verify` [Skill]** — Confirm a change works by building/running the app (v2.1.145+).
- **`/vim`** — (Removed in v2.1.92) Toggle Vim/Normal editing; now in `/config` → Editor mode.
- **`/voice [hold|tap|off]`** — Toggle voice dictation. https://code.claude.com/docs/en/voice-dictation
- **`/web-setup`** — Connect your GitHub account to Claude Code on the web.
- **`/workflows`** — Open the workflow progress view (watch/pause/resume/save). https://code.claude.com/docs/en/workflows

### MCP prompts as commands
- **`/mcp__<server>__<prompt>`** — MCP servers can expose prompts that appear as commands, discovered dynamically. https://code.claude.com/docs/en/mcp

---

## 4. Interactive mode — keyboard shortcuts, input modes, in-session features

Source: https://code.claude.com/docs/en/interactive-mode

### General controls
- **`Ctrl+C`** — Interrupt running op / clear input (twice exits).
- **`Ctrl+X Ctrl+K`** — Kill all running background subagents (twice to confirm).
- **`Ctrl+D`** — Exit (EOF).
- **`Ctrl+G` / `Ctrl+X Ctrl+E`** — Open prompt in default text editor.
- **`Ctrl+L`** — Redraw screen.
- **`Ctrl+O`** — Toggle transcript viewer / expand thinking & MCP calls.
- **`Ctrl+R`** — Reverse-search command history (`Ctrl+S` cycles scope; `Ctrl+R` again cycles matches).
- **`Ctrl+V` / `Cmd+V` (iTerm2) / `Alt+V` (WSL)** — Paste image from clipboard (inserts `[Image #N]`).
- **`Ctrl+B`** — Background the running task (tmux: twice).
- **`Ctrl+T`** — Toggle task list (also toggles syntax highlighting inside the `/theme` picker).
- **`Esc`** — Interrupt Claude mid-turn (keeps work done so far).
- **`Esc Esc`** — Clear input draft, or (when empty) open the rewind menu.
- **`Shift+Tab` (or `Alt+M`)** — Cycle permission modes.
- **`Option+P` / `Alt+P`** — Switch model. **`Option+T` / `Alt+T`** — Toggle extended thinking. **`Option+O` / `Alt+O`** — Toggle fast mode.

### Text editing (readline)
- `Ctrl+A`/`Ctrl+E` (line start/end), `Ctrl+K`/`Ctrl+U`/`Ctrl+W` (delete to EOL / to start / previous word), `Ctrl+Y` (paste), `Alt+Y` (cycle paste history), `Alt+B`/`Alt+F` (word back/forward).

### Multiline input
- `\`+`Enter`, `Option+Enter` (macOS Meta), native `Shift+Enter` (iTerm2/WezTerm/Ghostty/Kitty/Warp/Apple Terminal/Windows Terminal), `Ctrl+J` (any terminal), or paste mode. `/terminal-setup` installs Shift+Enter for VS Code/Cursor/Zed/etc.

### Quick prefixes
- **`/` at start** — Command or skill.
- **`!` at start** — Shell mode: run a command directly and add its output to context (history autocomplete via Tab).
- **`@`** — File-path mention with autocomplete (also MCP resources via `@server:protocol://path`).

### Other interactive features
- **Vim editor mode** — Full NORMAL/INSERT/VISUAL modes, motions, text objects (enable via `/config` → Editor mode).
- **Transcript viewer** (`Ctrl+O`) — `?` help, `{`/`}` jump prompts, `[` dump to scrollback, `v` open in `$EDITOR` (fullscreen).
- **Voice input** — Hold/tap `Space` for dictation (requires voice dictation enabled).
- **Command history** — Per-working-directory; reverse search; resets on `/clear`.
- **Background bash commands** — Run async (`Ctrl+B`); output to file readable via Read tool; auto-cleanup; 5GB cap; disable via `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`.
- **Prompt suggestions** — Grayed-out next-prompt predictions from git history / conversation (Tab to accept).
- **Side questions `/btw`** — Ephemeral question with full conversation visibility but no tools; `f` forks into a new session.
- **Task list** — Auto-created for multi-step work; `Ctrl+T` toggles; persists across compaction; shareable via `CLAUDE_CODE_TASK_LIST_ID`.
- **Session recap** — One-line recap when you return after stepping away; `/recap` on demand.
- **PR review status** — Clickable PR link in the footer, colored by review state (green/yellow/red/gray); refreshes every 60s (requires `gh`).

---

## 5. Plan mode, checkpoints/rewind, goals, background tasks

- **Plan mode** — Read-only exploration; Claude proposes a plan without editing source, then you approve (and choose the post-approval mode). Enter via `Shift+Tab`, `/plan`, or `--permission-mode plan`. https://code.claude.com/docs/en/permission-modes
- **Checkpointing** — Automatically snapshots file state before each edit; every user prompt creates a checkpoint; persists across sessions; cleaned up with sessions after 30 days (configurable). https://code.claude.com/docs/en/checkpointing
- **Rewind menu** (`/rewind`, or `Esc Esc` on empty input) — Restore code and/or conversation to a prior point, or **Summarize from/up to here** to compress part of the conversation. https://code.claude.com/docs/en/checkpointing
- **Checkpoint limitations** — Does not track bash-command file changes or external edits; not a replacement for git. https://code.claude.com/docs/en/checkpointing
- **Goals** (`/goal`) — Claude keeps working across turns until a stated condition is met. https://code.claude.com/docs/en/goal
- **Background tasks / agents** — Detach sessions (`/background`, `--bg`), monitor via `claude agents` / agent view, supervisor (daemon) process hosts them. https://code.claude.com/docs/en/agent-view
- **Dynamic workflows** — Bundled/`ultracode` workflows that fan work across many subagents and run in the background; `/workflows` to watch. https://code.claude.com/docs/en/workflows
- **Agent teams** — Parallel CLI sessions that message each other (`--teammate-mode`); CLI-only, not in Desktop. https://code.claude.com/docs/en/agent-teams
- **Worktrees** — Isolated git worktrees per session (`-w`); `.worktreeinclude` to copy gitignored files. https://code.claude.com/docs/en/worktrees

---

## 6. Model selection, effort, thinking, context

Source: https://code.claude.com/docs/en/model-config

- **Model aliases** — `default`, `best`, `sonnet`, `opus`, `haiku`, `sonnet[1m]`, `opus[1m]`, `opusplan` (Opus for planning, Sonnet for execution).
- **Set model** — `/model` (saves as default), `--model`, `ANTHROPIC_MODEL`, or `model` setting.
- **Effort levels** — `low`/`medium`/`high`/`xhigh`/`max` (model-dependent) + `ultracode` (xhigh + auto workflow orchestration); set via `/effort`, `--effort`, `effortLevel` setting, `CLAUDE_CODE_EFFORT_LEVEL`, or skill/subagent frontmatter.
- **`ultrathink` keyword** — Request deeper reasoning for one turn without changing the session effort setting.
- **Extended thinking & adaptive reasoning** — Toggle with `Option/Alt+T`; `alwaysThinkingEnabled` default; `MAX_THINKING_TOKENS=0` disables; `showThinkingSummaries` for full summaries; Opus 4.7+ always adaptive.
- **Extended (1M-token) context** — `opus[1m]`/`sonnet[1m]` and `[1m]` suffix for long sessions; availability varies by plan; `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` to disable.
- **Model restriction / overrides (enterprise)** — `availableModels` allowlist, `modelOverrides`, `ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU}_MODEL`, `ANTHROPIC_CUSTOM_MODEL_OPTION`, `CLAUDE_CODE_SUBAGENT_MODEL`.
- **Prompt caching** — Automatic; `DISABLE_PROMPT_CACHING[_HAIKU/_SONNET/_OPUS]` to disable. https://code.claude.com/docs/en/prompt-caching

---

## 7. Output styles

Source: https://code.claude.com/docs/en/output-styles

- **What they are** — Modify the system prompt to change role/tone/format (not knowledge).
- **Built-in styles** — **Default**, **Proactive** (act immediately, fewer pauses), **Explanatory** (educational "Insights"), **Learning** (collaborative, adds `TODO(human)` markers).
- **Switch** — `/config` → Output style; saved to `.claude/settings.local.json` as `outputStyle`.
- **Custom styles** — Markdown file in `~/.claude/output-styles`, `.claude/output-styles`, or managed dir; frontmatter `name`, `description`, `keep-coding-instructions`, `force-for-plugin`. Plugins can ship output styles.

---

## 8. Memory — CLAUDE.md, imports, rules, auto-memory

Source: https://code.claude.com/docs/en/memory

- **CLAUDE.md scopes** — Managed policy (`/Library/Application Support/ClaudeCode/CLAUDE.md`, `/etc/claude-code/`, `C:\Program Files\ClaudeCode\`), user (`~/.claude/CLAUDE.md`), project (`./CLAUDE.md` or `./.claude/CLAUDE.md`), local (`./CLAUDE.local.md`).
- **Load behavior** — Walks up the directory tree, concatenated root→cwd; subdirectory CLAUDE.md loads on demand; HTML comments stripped from context.
- **Imports** — `@path/to/import` syntax (relative/absolute, up to 4 hops deep); approval dialog on first external import.
- **AGENTS.md interop** — Claude reads CLAUDE.md; import or symlink AGENTS.md; `/init` incorporates AGENTS.md/.cursorrules/.windsurfrules.
- **Rules (`.claude/rules/`)** — Topic files loaded every session, or path-scoped via `paths:` frontmatter glob; user-level `~/.claude/rules/`; symlink sharing supported.
- **Auto-memory** — Claude writes notes itself per repository at `~/.claude/projects/<project>/memory/` (`MEMORY.md` index + topic files); first 200 lines/25KB of MEMORY.md loaded each session; toggle via `/memory`, `autoMemoryEnabled`, or `CLAUDE_CODE_DISABLE_AUTO_MEMORY`; `autoMemoryDirectory` to relocate.
- **`/memory` command** — List loaded memory/rules files, toggle auto-memory, open the auto-memory folder.
- **Enterprise controls** — Managed `claudeMd` setting (inline content), `claudeMdExcludes` (skip files by glob).
- **Managed CLAUDE.md** — Cannot be excluded; deployed via MDM/Group Policy.

---

## 9. Skills

Source: https://code.claude.com/docs/en/skills

- **What they are** — `SKILL.md` files (Agent Skills open standard) Claude uses automatically or you invoke via `/skill-name`; body loads only when used.
- **Custom commands merged into skills** — `.claude/commands/deploy.md` and `.claude/skills/deploy/SKILL.md` both create `/deploy`; existing `commands/` keep working.
- **Locations** — Project `.claude/skills/`, user `~/.claude/skills/`, plugin-provided.
- **Frontmatter controls** — `description` (drives auto-invocation), `disable-model-invocation` (hide from auto-invoke), visibility, subagent execution, dynamic context injection, `effort`, `$ARGUMENTS` placeholder.
- **Bundled skills** — Marked **[Skill]** in §3 (e.g. `/code-review`, `/debug`, `/batch`, `/verify`, `/run`, `/simplify`, `/loop`, `/deep-research` as workflow).
- **Management** — `/skills` (list, sort by tokens, hide), `/reload-skills`, `/run-skill-generator`.
- **Run-and-verify skills** — `/run` and `/verify` launch and drive the real app to confirm a change. https://code.claude.com/docs/en/skills

---

## 10. Subagents

Source: https://code.claude.com/docs/en/sub-agents

- **What they are** — Isolated Claude instances with their own context window, system prompt, tool access, and permissions; return only a summary.
- **Storage** — Project `.claude/agents/` and user `~/.claude/agents/`; manage via `/agents`.
- **Supported frontmatter** — `name`, `description` (drives delegation), `tools`, `model`, `effort`, `permissionMode` (ignored under auto mode), persistent memory option, plus a `prompt` field when defined inline via `--agents`.
- **Foreground vs background** — Subagents can run in foreground or background. https://code.claude.com/docs/en/sub-agents
- **Forked subagents** — `/fork` spawns a forked subagent when `CLAUDE_CODE_FORK_SUBAGENT` is set.
- **Model routing** — `CLAUDE_CODE_SUBAGENT_MODEL` overrides per-subagent model (or `inherit`).
- **Persistent memory** — Subagents can maintain their own auto memory. https://code.claude.com/docs/en/sub-agents
- **Kill** — `Ctrl+X Ctrl+K` kills all running background subagents.

---

## 11. Hooks — all events

Source: https://code.claude.com/docs/en/hooks

Lifecycle events (fire shell commands at fixed points; configured in settings `hooks` or plugin `hooks/hooks.json`):

1. **SessionStart** — Session begins or resumes.
2. **Setup** — `--init-only`, or `--init`/`--maintenance` in `-p` mode.
3. **UserPromptSubmit** — User submits a prompt, before Claude processes it.
4. **UserPromptExpansion** — A typed command expands into a prompt, before reaching Claude.
5. **PreToolUse** — Before a tool call (can block it).
6. **PermissionRequest** — When a permission dialog appears.
7. **PermissionDenied** — Tool call denied by the auto-mode classifier.
8. **PostToolUse** — After a tool call succeeds.
9. **PostToolUseFailure** — After a tool call fails.
10. **PostToolBatch** — After a full batch of parallel tool calls resolves.
11. **Notification** — When Claude Code sends a notification.
12. **MessageDisplay** — While assistant message text is displayed (display-only).
13. **SubagentStart** — When a subagent is spawned.
14. **SubagentStop** — When a subagent finishes.
15. **TaskCreated** — When a task is being created via `TaskCreate`.
16. **TaskCompleted** — When a task is marked completed.
17. **Stop** — When Claude finishes responding.
18. **StopFailure** — Turn ends due to an API error.
19. **TeammateIdle** — When an agent-team teammate is about to go idle.
20. **InstructionsLoaded** — When a CLAUDE.md or `.claude/rules/*.md` file loads into context.
21. **ConfigChange** — When a config file changes during a session.
22. **CwdChanged** — When the working directory changes.
23. **FileChanged** — When a watched file changes on disk.
24. **WorktreeCreate** — When a worktree is created (`--worktree` or `isolation: "worktree"`).
25. **WorktreeRemove** — When a worktree is removed.
26. **PreCompact** — Before context compaction.
27. **PostCompact** — After context compaction completes.
28. **Elicitation** — When an MCP server requests user input during a tool call.
29. **ElicitationResult** — After a user responds to an MCP elicitation, before sending back.
30. **SessionEnd** — When a session terminates.

- **Hook output semantics** — Exit code controls flow (0 success, 2 = blocking error; PreToolUse blocks on exit 2). https://code.claude.com/docs/en/hooks
- **SDK hooks** — Callback-based equivalents (`PreToolUse`, `PostToolUse`, `Stop`, `SessionStart`, `SessionEnd`, `UserPromptSubmit`, …). https://code.claude.com/docs/en/agent-sdk/hooks

---

## 12. Permissions & permission modes

Sources: https://code.claude.com/docs/en/permission-modes · https://code.claude.com/docs/en/settings

### Permission modes (complete)
- **`default`** — Reads run without asking; prompts for edits/commands.
- **`acceptEdits`** — Auto-approve file edits + common filesystem commands (`mkdir`, `touch`, `rm`, `rmdir`, `mv`, `cp`, `sed`) on in-scope paths; prompts for everything else.
- **`plan`** — Read-only; proposes a plan without editing; prompts still apply.
- **`auto`** (research preview) — Executes without prompts; a separate classifier model blocks escalations/external/hostile-driven actions. Requires Opus 4.6+/Sonnet 4.6; admin-enableable.
- **`dontAsk`** — Auto-deny anything that would prompt; only pre-approved `allow` rules and read-only Bash run (CI/locked-down).
- **`bypassPermissions`** — Skip all checks (containers/VMs only); `--dangerously-skip-permissions` equivalent; refuses to run as root.

### Permission rules & system
- **allow / ask / deny rules** — Rule syntax `Tool` or `Tool(specifier)` with wildcards (`Bash(npm run *)`, `Read(./.env)`, `WebFetch(domain:example.com)`). Evaluation: deny → ask → allow. Rules merge across scopes.
- **Mode cycling** — `Shift+Tab` cycles `default → acceptEdits → plan` (+ enabled `auto`/`bypassPermissions`).
- **Protected paths** — `.git`, `.config/git`, `.vscode`, `.idea`, `.husky`, `.cargo`, `.devcontainer`, `.yarn`, `.mvn`, `.claude` (except `commands`/`agents`/`skills`/`worktrees`), plus many protected files (shell rc, `.npmrc`, `.mcp.json`, `.claude.json`, etc.) — never auto-approved except in bypass.
- **Auto-mode classifier** — Configurable trusted infrastructure via `autoMode.environment`; conversation-stated boundaries treated as block signals; fallback to prompting after repeated blocks. https://code.claude.com/docs/en/auto-mode-config
- **`additionalDirectories`** — Grant file access outside the project (config not auto-discovered there).
- **Sandboxing** — Filesystem/network isolation for Bash commands (`/sandbox`). https://code.claude.com/docs/en/sandboxing

---

## 13. Settings & configuration layers

Source: https://code.claude.com/docs/en/settings

- **Precedence (high→low)** — Managed/policy → CLI flags → local (`.claude/settings.local.json`) → project (`.claude/settings.json`) → user (`~/.claude/settings.json`). Permission/array settings merge across scopes.
- **Managed locations** — `/Library/Application Support/ClaudeCode/`, `/etc/claude-code/`, `C:\Program Files\ClaudeCode\`.
- **Settings UI** — `/config` (tabbed); `/status` Status tab; `$schema` for autocomplete.
- **Key settings** — `model`, `agent`, `outputStyle`, `alwaysThinkingEnabled`, `autoMemoryEnabled`, `language`, `editorMode`, `defaultShell`, `tui`, `viewMode`, `respectGitignore`, `hooks`, `attribution`, `effortLevel`, `availableModels`, `modelOverrides`, `claudeMd`, `claudeMdExcludes`, `sshConfigs`, `sshHostAllowlist`, `permissions.{allow,ask,deny,defaultMode,additionalDirectories,disableBypassPermissionsMode}`.
- **Managed-only settings** — `allowedMcpServers`/`deniedMcpServers`, `allowManagedPermissionRulesOnly`, `allowManagedHooksOnly`, `strictKnownMarketplaces`, `strictPluginOnlyCustomization`, `forceLoginMethod`, `forceLoginOrgUUID`, `forceRemoteSettingsRefresh`, `disableAutoMode`, `autoMode`, `managedMcpServers`. https://code.claude.com/docs/en/permissions
- **Environment variables** — `env` block in settings; many env vars (`CLAUDE_CODE_*`, `ANTHROPIC_*`, `DISABLE_*`, `NO_COLOR`/`FORCE_COLOR`, `MCP_TIMEOUT`, `MAX_MCP_OUTPUT_TOKENS`, …). https://code.claude.com/docs/en/env-vars
- **Status line** — Custom shell-driven status line (`/statusline`). https://code.claude.com/docs/en/statusline
- **Keybindings** — Customizable via `~/.claude/keybindings.json` (`/keybindings`). https://code.claude.com/docs/en/keybindings

---

## 14. MCP (Model Context Protocol)

Source: https://code.claude.com/docs/en/mcp

- **Transports** — HTTP (recommended; `streamable-http` alias), SSE (deprecated), stdio (local process), WebSocket (`type: "ws"`).
- **Add servers** — `claude mcp add --transport <t> <name> <url|-- cmd>`, `claude mcp add-json`, `claude mcp add-from-claude-desktop`.
- **Scopes** — local (`~/.claude.json`, default), project (`.mcp.json`, shared/version-controlled, requires approval), user (`~/.claude.json`, all projects); precedence local→project→user→plugin→claude.ai connectors.
- **Manage** — `claude mcp list / get / remove / reset-project-choices`; `/mcp` panel (status, tool count, OAuth).
- **OAuth 2.0** — Auto-detection on 401/403; `--callback-port`, `--client-id`, `--client-secret`, `authServerMetadataUrl`, `oauth.scopes`, CIMD/DCR support; tokens stored in keychain.
- **Dynamic headers** — `headersHelper` for non-OAuth auth (Kerberos, SSO, short-lived tokens).
- **Env var expansion** — `${VAR}` / `${VAR:-default}` in `.mcp.json` (`command`/`args`/`env`/`url`/`headers`).
- **MCP resources** — `@server:protocol://resource/path` mentions; auto-fetched as attachments.
- **MCP prompts as commands** — `/mcp__server__prompt` (with arguments).
- **Tool Search** — Default-on deferral of MCP tool definitions to save context (`ENABLE_TOOL_SEARCH=true/auto/auto:N/false`); `alwaysLoad` per server/tool.
- **Elicitation** — Servers request structured input mid-task (form or URL mode); `Elicitation` hook to auto-respond.
- **Channels** (research preview) — MCP servers push messages into the session (`--channels`). https://code.claude.com/docs/en/channels
- **Dynamic tool updates & auto-reconnect** — `list_changed` notifications; exponential-backoff reconnection for HTTP/SSE.
- **Output limits** — Warn at 10K tokens; `MAX_MCP_OUTPUT_TOKENS` (default 25K); `anthropic/maxResultSizeChars` per tool.
- **claude.ai connectors** — Connectors added at claude.ai/customize/connectors auto-available when authed via subscription (`ENABLE_CLAUDEAI_MCP_SERVERS`).
- **Claude Code as MCP server** — `claude mcp serve` exposes Claude's tools to other MCP clients.
- **Managed MCP** — `managed-mcp.json`, `allowedMcpServers`/`deniedMcpServers`. https://code.claude.com/docs/en/managed-mcp

---

## 15. Claude Code Desktop app (the **Code** tab)

Source: https://code.claude.com/docs/en/desktop

- **Platforms & install** — macOS (universal) and Windows (x64/ARM64); not on Linux. Three tabs: **Chat**, **Cowork**, **Code**. Requires Pro/Max/Team/Enterprise.
- **Sessions** — Each session has its own chat history, project folder, and code changes; sidebar lists/runs many in parallel; per-session Git worktree isolation.
- **Environment picker** — **Local** (your machine), **Remote** (Anthropic cloud, persists when app closed, multi-repo), **SSH** (remote machine you manage).
- **Prompt box** — `+` for file attachments / skills / connectors / plugins; `@mention` files (local/SSH); drag-and-drop images/PDFs; interrupt and redirect mid-action.
- **Permission modes (Desktop)** — Ask permissions / Auto accept edits / Plan mode / Auto / Bypass permissions (`dontAsk` is CLI-only).
- **Preview pane** — Embedded browser; Claude starts dev servers, takes screenshots, inspects DOM, clicks/fills forms, self-verifies; opens HTML/PDF/image/video; persist sessions/cookies; configured via `.claude/launch.json` (`autoVerify`, multiple servers, ports).
- **Diff view** — File-by-file review; comment on lines (Cmd/Ctrl+Enter to submit); **Review code** button for an inline AI review of the diff.
- **PR monitoring** — CI status bar; **Auto-fix** failing checks; **Auto-merge** (squash) when checks pass; desktop notification on CI finish; auto-archive on PR merge/close (requires `gh`).
- **Workspace panes** — Chat, diff, preview, terminal, file editor, plan, tasks, subagent panes — drag/resize/close; **Views** menu; split-view two sessions.
- **Integrated terminal** — Shares Claude's working dir/env (local only); multiple tabs.
- **File editor pane** — Open/edit/save files; stale-file warnings (local/SSH).
- **Open files in other apps** — Attach as context, Open in VS Code/Cursor/Zed, Show in Finder/Explorer, Copy path.
- **View modes** — Normal / Verbose / Summary (`Ctrl+O` to cycle).
- **Keyboard shortcuts** — `Cmd/Ctrl+N` new session, `Cmd/Ctrl+W` close, `Ctrl+Tab`/`Ctrl+Shift+Tab` cycle sessions, `Cmd/Ctrl+Shift+D` diff, `Cmd/Ctrl+Shift+P` preview, `Cmd/Ctrl+Shift+S` select element, `Ctrl+\`` terminal, `Cmd/Ctrl+\` close pane, `Cmd/Ctrl+;` side chat, `Ctrl+O` view modes, `Cmd/Ctrl+Shift+M/I/E` permission-mode/model/effort menus.
- **Usage ring** — Per-session context usage + shared plan usage for the period.
- **Computer use** (research preview, macOS/Windows, Pro/Max) — Claude opens apps and controls your screen; off by default; per-app permission tiers (View only / Click only / Full control); denied-apps list; needs macOS Accessibility + Screen Recording.
- **Side chat** (`Cmd/Ctrl+;` or `/btw`) — Ask a question using session context without adding to the main thread.
- **Tasks pane** — Background subagents, background shell commands, and dynamic workflows; click to view/stop.
- **Run long-running tasks remotely** — Remote (cloud) sessions continue when app closed; multi-repo; monitor from claude.ai/code or iOS.
- **Continue in** menu — Move a session to Claude Code on the Web or open in your IDE.
- **Sessions from Dispatch** — Dispatch (in the Cowork tab) can spawn Code sessions; appear with a Dispatch badge; phone push notifications. https://support.claude.com/en/articles/13947068
- **Scheduled tasks** — Recurring work on a schedule. https://code.claude.com/docs/en/desktop-scheduled-tasks
- **Shared config with CLI** — CLAUDE.md, MCP servers, hooks, skills, settings, models shared; loads `claude_desktop_config.json` MCP servers too; `/desktop` moves a CLI session into the app.
- **Enterprise config** — Admin console controls (Code in desktop/web, Remote Control, disable bypass); managed settings (`sshConfigs`, `sshHostAllowlist`, `managedMcpServers`, `disableAutoMode`); MDM (`com.anthropic.Claude`) / Windows registry (`SOFTWARE\Policies\Claude`); SSO; MSIX/.dmg deployment.
- **Not available in Desktop** — Third-party providers (default Anthropic API; enterprise can configure Vertex/gateway), Linux, inline code suggestions, agent teams, terminal-dialog commands (`/permissions`, `/config`, `/agents`, `/doctor`), `--print`/scripting.

---

## 16. Claude Desktop app — product Settings sections

> The Claude Desktop app exposes (per the prompt and support docs) these Settings areas: General, Account, Privacy, Billing, Usage, Capabilities, Connectors, Claude Code, Cowork, Claude (Beta), and Desktop app → General / Extensions / Developer. Many of these belong to the broader Claude product rather than Claude Code specifically.

- **Connectors** — Extend Claude with tools; **remote (web) connectors** (default; work on web/desktop/mobile; cloud SaaS like Slack/Notion/Linear/GitHub) vs **desktop extensions** (local MCP; desktop/Claude Code only; for local files/databases/OS access). Add custom connectors via remote MCP (name, URL, optional OAuth client ID/secret). https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities · https://support.claude.com/en/articles/11725091-when-to-use-desktop-and-web-connectors · https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp
- **Extensions (Desktop app → Extensions)** — One-click install of local MCP servers packaged as Desktop Extensions (`.mcpb`/MCPB, a zip with the MCP server + `manifest.json`); "Browse extensions" directory; configure per-extension settings (API keys); **Advanced settings → Extension Developer → Install Extension…** to side-load a `.mcpb`. https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop · https://support.claude.com/en/articles/12922929-building-desktop-extensions-with-mcpb · https://www.anthropic.com/engineering/desktop-extensions
- **Extension allowlist (enterprise)** — Enable/use a desktop-extension allowlist. https://support.claude.com/en/articles/12592343-enabling-and-using-the-desktop-extension-allowlist
- **Capabilities** — Per-app permission safeguards: Claude asks before accessing each application; some sensitive apps (e.g. investment/trading platforms) blocked by default. https://support.claude.com/en/articles/14128542-let-claude-use-your-computer-in-cowork
- **Usage panel** — Plan usage limits and activity (shared across Claude Code surfaces; per-session context usage shown separately). https://code.claude.com/docs/en/costs
- **Billing** — API-rate billing distinct from Pro/Max pricing; transitions to API-credit usage require explicit consent. *(Sourced via support search excerpt — see Sourcing gaps.)*
- **Privacy** — Adjustable privacy settings; data de-linked from user ID before any training review; opt-in to improve Claude. https://support.claude.com/en/articles/8325621-i-would-like-to-input-sensitive-data-into-my-chats-with-claude-who-can-view-my-conversations
- **Account / General / Claude (Beta)** — Standard account, app-general (theme/startup), and beta-feature toggles. *(Not separately documented in a single Claude Code doc page — see Sourcing gaps.)*
- **Enterprise configuration profiles** — Centrally manage Claude Desktop settings without user intervention. https://support.claude.com/en/articles/12622667-enterprise-configuration-for-claude-desktop

---

## 17. Cowork (Claude Desktop tab)

Sources: https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork · https://claude.com/docs/cowork/3p/extensions (via search excerpts — see Sourcing gaps)

- **What it is** — Same agentic architecture as Claude Code, in Claude Desktop without a terminal; takes on complex multi-step tasks.
- **File/folder access** — You connect a folder; Claude reads/edits/creates files only in connected folders; network access follows configured egress settings.
- **File creation** — Generates `.xlsx` (with working formulas, VLOOKUP, conditional formatting, multiple tabs), `.pptx`, `.docx`, `.pdf`. https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude
- **Isolation/safety** — Shell commands and code run inside an isolated local VM; files not uploaded to Anthropic servers; Cowork readiness check on first launch. https://support.claude.com/en/articles/13364135-use-claude-cowork-safely
- **Customize panel** — Enable connectors (authorize once), plugins, and skills from the left-sidebar Customize panel; global instructions via Settings → Cowork → Edit. https://claude.com/resources/tutorials/customize-claude-cowork
- **Extensibility (MCP, plugins, skills, hooks)** — Cowork supports MCP servers, plugins, skills, and hooks. https://claude.com/docs/cowork/3p/extensions
- **Dispatch** — Persistent conversation living in Cowork; you message a task and it decides how to handle it (can spawn Code sessions). Pro/Max only. https://support.claude.com/en/articles/13947068
- **Computer use in Cowork** — Claude can use your computer to complete tasks. https://support.claude.com/en/articles/14128542-let-claude-use-your-computer-in-cowork
- **Plugins in Cowork** — https://support.claude.com/en/articles/13837440-use-plugins-in-claude-cowork
- **Third-party platforms** — Extend Cowork with third-party platforms. https://support.claude.com/en/articles/14680753-extend-claude-cowork-with-third-party-platforms

---

## 18. IDE integrations

### VS Code extension (and Cursor / forks)
Source: https://code.claude.com/docs/en/ide-integrations (VS Code page)
- Native graphical panel (sidebar/tab/window); review & edit plans before accepting; auto-accept edits; `@`-mention files with line ranges; conversation history; multiple tabs.
- Permission-mode selector; command menu (`/`); context indicator; extended-thinking toggle; multi-line `Shift+Enter`.
- Side-by-side diffs with inline approve/reject/edit; checkpoints (fork/rewind from any message).
- Resume local & remote (claude.ai web) sessions; `@browser` Chrome automation; `@terminal:name` output; URI handler `vscode://anthropic.claude-code/open` (`prompt`, `session`).
- Extension settings: `useTerminal`, `initialPermissionMode`, `preferredLocation`, `autosave`, `useCtrlEnterToSend`, `respectGitIgnore`, `usePythonEnvironment`, `allowDangerouslySkipPermissions`, etc.
- **Built-in IDE MCP server** (`ide`) — Local MCP server the CLI auto-connects to: `mcp__ide__getDiagnostics` (Problems-panel diagnostics) and `mcp__ide__executeCode` (run Python in active Jupyter notebook, always asks first); also opens diffs, reads selection, saves files.
- Shared `~/.claude/settings.json` with CLI; third-party providers (Bedrock/Vertex/Foundry) supported.

### JetBrains plugin
Source: https://code.claude.com/docs/en/permission-modes (JetBrains tab) — runs Claude Code in the IDE terminal; mode switching via `Shift+Tab` / `--permission-mode`; diff viewing and diagnostic sharing via `/ide`.

---

## 19. GitHub Actions / CI

Source: https://code.claude.com/docs/en/github-actions

- **`@claude` mentions** — In any PR or issue comment, Claude analyzes code, implements features, fixes bugs, creates PRs (follows CLAUDE.md).
- **`anthropics/claude-code-action@v1`** — The GitHub Action; auto-detects interactive (`@claude`) vs automation (prompt) mode.
- **Setup** — `/install-github-app` (admin), or manual (install GitHub app, add `ANTHROPIC_API_KEY` secret, copy workflow). App needs Contents/Issues/Pull requests read+write.
- **Inputs** — `prompt` (plain text or `/skill` name), `claude_args` (any CLI args), `plugin_marketplaces`, `plugins`, `trigger_phrase`, `use_bedrock`, `use_vertex`, `anthropic_api_key`, `github_token`.
- **Providers** — Direct Claude API, Amazon Bedrock (OIDC + IAM role), Google Vertex AI (Workload Identity Federation).
- **GitHub Code Review** — Automatic reviews on every PR without a trigger. https://code.claude.com/docs/en/code-review
- **Built on the Agent SDK** for custom automation. https://code.claude.com/docs/en/agent-sdk/overview

---

## 20. Claude Code on the web (cloud sessions)

Source: https://code.claude.com/docs/en/claude-code-on-the-web (research preview; Pro/Max/Team and premium Enterprise)

- **Cloud sessions** at claude.ai/code on Anthropic-managed infra; persist when browser closed; monitor from the mobile app.
- **GitHub auth** — Two ways to connect GitHub for cloning code / pushing branches.
- **Cloud environment** — Configurable network access levels, env vars, setup scripts, Docker; default allowlist; custom environments.
- **Move between web ↔ terminal** — `--remote` (create a web session from terminal), `--teleport`/`/teleport` (pull a web session locally).
- **Auto-fix pull requests** — `/autofix-pr` watches the PR and responds to CI failures and review comments.
- **Multiple repositories** — Add several repos per cloud session, each with its own branch.
- **Security & isolation** — Sessions are sandboxed/isolated; rate-limit and platform limitations apply.
- **Ultraplan / Ultrareview** — Browser-based plan review and deep cloud multi-agent review run as web sessions. https://code.claude.com/docs/en/ultraplan · https://code.claude.com/docs/en/ultrareview

---

## 21. Agent SDK (formerly Claude Code SDK)

Source: https://code.claude.com/docs/en/agent-sdk/overview (`platform.claude.com/docs/...` redirects here)

- **What it is** — Build production agents with Claude Code's tools, agent loop, and context management as a library, in **Python** (`pip install claude-agent-sdk`, 3.10+) and **TypeScript** (`npm i @anthropic-ai/claude-agent-sdk`, bundles the native binary).
- **Built-in tools** — Read, Write, Edit, Bash, Monitor, Glob, Grep, WebSearch, WebFetch, AskUserQuestion.
- **Capabilities** — Hooks (callback-based), subagents (`AgentDefinition`/`agents`), MCP servers, permissions (`allowed_tools`/`permission_mode`), sessions (capture/resume/fork session ID), structured outputs (`--json-schema`).
- **Claude Code config support** — Loads `.claude/` skills, commands, memory, plugins (`setting_sources`/`settingSources`).
- **Auth** — `ANTHROPIC_API_KEY` or Bedrock/Vertex/Foundry/AWS env vars (claude.ai login not permitted for third-party SDK products).
- **Comparisons** — vs Client SDK (you implement the tool loop) · vs CLI (same engine, programmatic) · vs **Managed Agents** (hosted REST API + sandbox). https://code.claude.com/docs/en/managed-agents/overview
- **Plan note** — From 2026-06-15, Agent SDK + `claude -p` on subscription plans draw from a separate monthly Agent SDK credit.

---

## 22. Plugins

Sources: https://code.claude.com/docs/en/plugins · https://code.claude.com/docs/en/plugins-reference · https://code.claude.com/docs/en/plugin-marketplaces

- **What they bundle** — Skills (`skills/`), legacy commands (`commands/`), agents (`agents/`), hooks (`hooks/hooks.json`), MCP servers (`.mcp.json`), LSP servers (`.lsp.json`), background monitors (`monitors/monitors.json`), `bin/` executables, default `settings.json`. Manifest at `.claude-plugin/plugin.json`.
- **Namespaced skills** — `/plugin-name:skill` to avoid conflicts.
- **Install/manage** — `/plugin`, `claude plugin install`, `--plugin-dir`/`--plugin-url`, VS Code `/plugins` UI; scopes user/project/local.
- **Marketplaces** — `claude-plugins-official` (built-in), `claude-community` (public submissions); add custom via `/plugin marketplace add`; `claude plugin validate`; submit at claude.ai/settings/plugins/submit.
- **Skills-directory plugins** — `claude plugin init` scaffolds `~/.claude/skills/<name>/` that auto-loads.
- **LSP plugins** — Pre-built TypeScript/Python/Rust LSP plugins for real-time code intelligence.

---

## 23. Authentication, accounts, providers

Sources: https://code.claude.com/docs/en/authentication · https://code.claude.com/docs/en/desktop

- **`/login` / `/logout` / `claude auth login`** — Claude.ai subscription or Anthropic Console (`--console`); SSO (`--sso`).
- **`/setup-token` / `claude setup-token`** — Long-lived OAuth token for CI/scripts.
- **Third-party providers** — Amazon Bedrock (`CLAUDE_CODE_USE_BEDROCK`), Google Vertex AI (`CLAUDE_CODE_USE_VERTEX`), Microsoft Foundry (`CLAUDE_CODE_USE_FOUNDRY`), Claude Platform on AWS, LLM gateways (`ANTHROPIC_BASE_URL`). https://code.claude.com/docs/en/llm-gateway
- **Enterprise auth** — `forceLoginMethod`, `forceLoginOrgUUID`, SSO/SAML/OIDC. https://support.claude.com/en/articles/13132885-setting-up-single-sign-on-sso

---

## 24. Cost tracking, usage, scheduling, remote control

- **`/usage` (`/cost`, `/stats`)** — Session cost, plan limits, activity; breakdown by skill/subagent/plugin/MCP. https://code.claude.com/docs/en/costs
- **Usage credits** — `/usage-credits` to keep working past a limit. https://support.claude.com/en/articles/12429409-extra-usage-for-paid-claude-plans
- **Budget caps** — `--max-budget-usd`, `--max-turns` (print mode).
- **Routines / scheduled tasks** — `/schedule` (cloud cron), `/loop` (in-session recurring), Desktop scheduled tasks. https://code.claude.com/docs/en/routines · https://code.claude.com/docs/en/scheduled-tasks · https://code.claude.com/docs/en/desktop-scheduled-tasks
- **Remote Control** — Control a local session from claude.ai or the Claude app (`/remote-control`, `claude remote-control`). https://code.claude.com/docs/en/remote-control
- **Deep links** — Launch sessions from links (`claude-cli://`, VS Code `vscode://`). https://code.claude.com/docs/en/deep-links
- **Mobile app** — Monitor remote sessions; `/mobile` QR code.
- **Slack app** — `/install-slack-app`. **Telegram/Discord/webhooks** via channels.

---

## 25. Browser & computer control

- **Claude in Chrome** — Browser automation/testing via the Chrome extension; `--chrome`, `/chrome`, `@browser` in VS Code. https://code.claude.com/docs/en/chrome
- **Computer use (Desktop)** — Screen/app control on macOS/Windows (research preview, Pro/Max). https://code.claude.com/docs/en/desktop
- **Computer use (CLI)** — Enable via `/mcp` on macOS. https://code.claude.com/docs/en/computer-use

---

## 26. Claude product features the desktop app surfaces (intersecting)

> Noted for completeness; primarily the broader Claude product, exposed in/near the desktop app.

- **Connectors / integrations** — Shared connector infrastructure (MCP) across Claude surfaces (§14, §16).
- **Skills** — Agent Skills standard shared across Claude tools (§9).
- **Artifacts, Projects, Research** — Claude.ai chat features (Artifacts, Projects, Research) surfaced in the **Chat** tab. *(Not documented in Claude Code docs — see Sourcing gaps.)*
- **Excel / Word add-ins** — "Use Claude for Excel" cross-file context. https://support.claude.com/en/articles/12650343-use-claude-for-excel

---

## Sourcing gaps / could not fully confirm in official docs

The following could not be confirmed from a directly fetchable official doc page (the `support.claude.com` and `claude.com/docs` hosts returned cross-host redirect/permission errors during fetching; content below is from official-domain **search excerpts** only, or was not found on a single canonical Claude Code page):

1. **Claude Desktop product Settings tabs** (General, Account, Privacy, Billing, Usage, Capabilities, Claude (Beta)) are not enumerated on one canonical Claude Code doc page. Connectors, Extensions, Cowork, and Claude Code settings are confirmed; the per-tab contents of General/Account/Privacy/Billing/Claude(Beta) are inferred from support-article search excerpts and should be verified directly in the app or at support.claude.com.
2. **Cowork details** (file creation formats, local VM isolation, Dispatch, Customize panel, third-party extensions) come from `support.claude.com`/`claude.com/docs` **search excerpts**, not fetched pages — verify against the cited article URLs.
3. **Desktop Extensions / MCPB** specifics (allowlist, developer install flow) from search excerpts of support.claude.com — verify the cited URLs.
4. **Billing/Privacy specifics** in §16 are from a support search summary, not a fetched page.
5. **Artifacts / Projects / Research** (Chat tab) are Claude.ai product features outside the Claude Code docs and were intentionally only noted, not audited.
6. **Subagent frontmatter** full field list (§10) is summarized from the subagents page; the exhaustive field-by-field table on https://code.claude.com/docs/en/sub-agents#supported-frontmatter-fields should be consulted for the canonical list.
7. Version-gated items (commands removed/added at specific versions, e.g. `/vim`, `/pr-comments`) reflect the docs as of the audit date and may shift.

---

## Doc URLs used (for traceability)

- https://code.claude.com/docs/en/commands
- https://code.claude.com/docs/en/cli-reference
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/settings
- https://code.claude.com/docs/en/permission-modes
- https://code.claude.com/docs/en/permissions
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/mcp
- https://code.claude.com/docs/en/checkpointing
- https://code.claude.com/docs/en/output-styles
- https://code.claude.com/docs/en/model-config
- https://code.claude.com/docs/en/interactive-mode
- https://code.claude.com/docs/en/desktop
- https://code.claude.com/docs/en/ide-integrations (VS Code)
- https://code.claude.com/docs/en/github-actions
- https://code.claude.com/docs/en/claude-code-on-the-web
- https://code.claude.com/docs/en/plugins
- https://code.claude.com/docs/en/agent-sdk/overview
- https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities
- https://support.claude.com/en/articles/11725091-when-to-use-desktop-and-web-connectors
- https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp
- https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork
- https://support.claude.com/en/articles/13364135-use-claude-cowork-safely
- https://support.claude.com/en/articles/13837440-use-plugins-in-claude-cowork
- https://support.claude.com/en/articles/14680753-extend-claude-cowork-with-third-party-platforms
- https://support.claude.com/en/articles/14128542-let-claude-use-your-computer-in-cowork
- https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude
- https://support.claude.com/en/articles/12650343-use-claude-for-excel
- https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop
- https://support.claude.com/en/articles/12922929-building-desktop-extensions-with-mcpb
- https://support.claude.com/en/articles/12592343-enabling-and-using-the-desktop-extension-allowlist
- https://support.claude.com/en/articles/12622667-enterprise-configuration-for-claude-desktop
- https://support.claude.com/en/articles/13947068 (Dispatch)
- https://claude.com/docs/cowork/3p/extensions
- https://claude.com/resources/tutorials/customize-claude-cowork
- https://www.anthropic.com/engineering/desktop-extensions
