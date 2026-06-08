# Advisory review — loop/slash-commands-view

Gate: pass (depth=full). Blocking findings: none.

## Advisory (non-blocking)
- **[conventions]** AgentChat.tsx exceeds the 300-line hard limit — `/Users/michaeltouboul/perso/claude-agent-manager/.claude/worktrees/loop-slash-commands-view/src/components/AgentChat/AgentChat.tsx:330`
  The file is 330 lines after the branch adds ~10 lines (VIEW_PANEL_KEY map, import, openView prop). CLAUDE.md enforces a 300-line hard limit (ESLint max-lines: error). The file was already over the limit before this diff landed more content; the branch pushes it 30 lines past the cap. Per the convention, the required fix is to extract a logical unit — the most natural split is the onEvent/sendNextFromQueue imperative core into a custom hook (e.g. useAgentChatSession), reducing AgentChat.tsx to layout + wiring.
