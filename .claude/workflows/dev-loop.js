export const meta = {
  name: 'dev-loop',
  description: 'Lean autonomous dev loop for one feature: setup worktree → feature-dev (strict TDD, gate-verified) → deterministic integrate (merge + re-gate + push, or bounded retry, or desktop-notify). The gate (lint/typecheck/build/tests) is the quality bar — no separate multi-review pass (kept lean to save tokens).',
  phases: [
    { title: 'Setup' },
    { title: 'Develop' },
    { title: 'Integrate' },
  ],
}

// ---- input -------------------------------------------------------------
// args: { input?: string (prompt for a fix), specPath?: string (a spec/plan doc), base?: string }
// args may arrive as an object, a JSON string, or a bare prompt string — normalize.
let opts = args
if (typeof opts === 'string') {
  try { opts = JSON.parse(opts) } catch { opts = { input: args } }
}
opts = opts || {}

const specPath = opts.specPath
const promptInput = opts.input
const base = opts.base || 'main'
const MAX_RETRIES = 2

if (!specPath && !promptInput) {
  throw new Error('dev-loop needs args.input (a prompt) or args.specPath (a spec-doc path)')
}
const featureDesc = specPath ? `the spec at \`${specPath}\`` : `this request: ${promptInput}`

// ---- schemas -----------------------------------------------------------
const SETUP = {
  type: 'object', additionalProperties: false,
  required: ['worktree', 'branch'],
  properties: { worktree: { type: 'string' }, branch: { type: 'string' } },
}
const DEV = {
  type: 'object', additionalProperties: false,
  required: ['gatePassed', 'summary'],
  properties: {
    gatePassed: { type: 'boolean' },
    summary: { type: 'string' },
  },
}
const INTEGRATE = {
  type: 'object', additionalProperties: false,
  required: ['result'],
  properties: {
    result: { type: 'string', enum: ['merged-clean', 'reverted', 'conflict'] },
    detail: { type: 'string' },
  },
}

// ---- step 0: orchestrator-owned worktree -------------------------------
phase('Setup')
const setup = await agent(
  `Create a fresh git worktree off \`${base}\` for a new feature, then report its absolute path and branch. Do NOT write any feature code.\n` +
  `1. Choose a short kebab-case branch like \`loop/<slug>\` from: ${featureDesc} (<40 chars; if unsure, \`loop/feature\`).\n` +
  `2. dir=".claude/worktrees/$(echo <branch> | tr / -)"  ;  git worktree add "$dir" -b "<branch>" ${base}\n` +
  `3. Return the ABSOLUTE worktree path (\`git -C "$dir" rev-parse --show-toplevel\`) and the branch name.`,
  { label: 'setup-worktree', phase: 'Setup', schema: SETUP },
)
if (!setup || !setup.worktree) throw new Error('worktree setup failed')
log(`worktree ${setup.worktree} on ${setup.branch}`)

// ---- step 1: develop until the gate is green (bounded retries) ----------
// The gate is the ONLY quality bar — feature-dev's strict TDD plus
// lint/typecheck/build/tests. No multi-review pass.
let gatePassed = false
let attempt = 0
let lastSummary = ''
while (attempt <= MAX_RETRIES) {
  phase('Develop')
  const fixNote = attempt
    ? `\n\nThis is retry ${attempt}/${MAX_RETRIES}. The previous attempt left the gate RED (${lastSummary}). Fix it and get \`bash .claude/hooks/gate.sh\` FULLY green.`
    : ''
  const dev = await agent(
    `Work in the worktree \`${setup.worktree}\` (cd there; use absolute paths under it).\n` +
    `Implement ${featureDesc} per your feature-dev rules (strict TDD, CLAUDE.md conventions). ` +
    `Write real tests — they are the safety net for this lean loop. Self-verify with \`bash .claude/hooks/gate.sh\` until it is FULLY green ` +
    `(lint 0 errors/0 warnings, typecheck renderer + electron, build, all tests), then commit on this branch — no push, no merge.${fixNote}`,
    { label: `develop:attempt-${attempt}`, phase: 'Develop', schema: DEV, agentType: 'feature-dev' },
  )
  lastSummary = dev ? dev.summary : 'agent failed'
  if (dev && dev.gatePassed) { gatePassed = true; break }
  log(`attempt ${attempt}: gate not green — ${lastSummary}`)
  attempt++
}

// ---- step 2: deterministic integrate -----------------------------------
phase('Integrate')
if (gatePassed) {
  const integrate = await agent(
    `You are the integrator. The feature on branch \`${setup.branch}\` is committed and gate-green in its worktree. Do EXACTLY this, no improvisation — run it as a SINGLE bash script from the main checkout (env vars don't persist across separate calls, so keep it one block):\n` +
    '```bash\n' +
    `set -uo pipefail\n` +
    `cd "$(git rev-parse --show-toplevel)"\n` +
    `before=$(git rev-parse HEAD)\n` +
    `git checkout ${base}\n` +
    `if ! git merge --no-ff "${setup.branch}" -m "Merge ${setup.branch}: dev-loop"; then\n` +
    `  git merge --abort || true\n` +
    `  osascript -e 'display notification "merge conflict" with title "ClaudeIn dev-loop: ${setup.branch}"'\n` +
    `  echo RESULT=conflict; exit 0\n` +
    `fi\n` +
    `npm install --no-audit --no-fund >/dev/null 2>&1 || true\n` +
    `if bash .claude/hooks/gate.sh; then\n` +
    `  git worktree remove --force "${setup.worktree}"; git branch -d "${setup.branch}"\n` +
    `  if git push origin ${base}; then\n` +
    `    echo RESULT=merged-clean\n` +
    `  else\n` +
    `    osascript -e 'display notification "merged + gate green but PUSH FAILED — push ${base} manually" with title "ClaudeIn dev-loop: ${setup.branch}"'\n` +
    `    echo RESULT=merged-clean\n` +
    `  fi\n` +
    `else\n` +
    `  git reset --hard "$before"\n` +
    `  osascript -e 'display notification "main gate red after merge — reverted" with title "ClaudeIn dev-loop: ${setup.branch}"'\n` +
    `  echo RESULT=reverted\n` +
    `fi\n` +
    '```\n\n' +
    `Return \`result\` = the RESULT=… value you saw (merged-clean | reverted | conflict), plus a one-line detail.`,
    { label: 'integrate', phase: 'Integrate', schema: INTEGRATE },
  )
  log(`integrate: ${integrate ? integrate.result : 'agent failed'}`)
  return {
    status: integrate ? integrate.result : 'integrate-failed',
    branch: setup.branch,
    worktree: setup.worktree,
    attempts: attempt + 1,
  }
}

// gate never green after retries: leave worktree intact, desktop-notify
const why = `gate never green after ${attempt} attempts`
await agent(
  `Run this and nothing else:\n` +
  `osascript -e 'display notification "${why} — worktree left intact" with title "ClaudeIn dev-loop: ${setup.branch}"'`,
  { label: 'notify-failure', phase: 'Integrate' },
)
log(`FAILED — ${why}. Worktree ${setup.worktree} left intact for you.`)
return {
  status: 'failed',
  branch: setup.branch,
  worktree: setup.worktree,
  attempts: attempt,
  summary: lastSummary,
}
