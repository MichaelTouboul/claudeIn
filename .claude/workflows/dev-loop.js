export const meta = {
  name: 'dev-loop',
  description: 'Autonomous dev loop for one feature: setup worktree → feature-dev (TDD) → multi-review → deterministic integrate (merge + re-gate + push, or bounded retry, or desktop-notify).',
  phases: [
    { title: 'Setup' },
    { title: 'Develop' },
    { title: 'Review' },
    { title: 'Integrate' },
  ],
}

// ---- input -------------------------------------------------------------
// args: { input?: string (prompt for a simple fix), specPath?: string (a spec doc),
//         depth?: 'light'|'full', base?: string }
// args may arrive as an object, a JSON string, or a bare prompt string — normalize.
let opts = args
if (typeof opts === 'string') {
  try { opts = JSON.parse(opts) } catch { opts = { input: args } }
}
opts = opts || {}

const specPath = opts.specPath
const promptInput = opts.input
const base = opts.base || 'main'
const depth = opts.depth || (specPath ? 'full' : 'light')
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
const reportFile = `docs/reviews/${setup.branch.split('/').join('-')}.md`
log(`worktree ${setup.worktree} on ${setup.branch} (depth=${depth})`)

// ---- steps 1+2: develop → review, bounded retries ----------------------
let review = null
let blockers = []
let attempt = 0
while (attempt <= MAX_RETRIES) {
  phase('Develop')
  const fixNote = blockers.length
    ? `\n\nThis is retry ${attempt}/${MAX_RETRIES}. A prior review found these BLOCKING issues — fix them and keep the gate green:\n` +
      blockers.map((b, i) => `${i + 1}. [${b.lens}] ${b.title} — ${b.file}${b.line ? ':' + b.line : ''}\n   ${b.detail}`).join('\n')
    : ''
  const dev = await agent(
    `Work in the worktree \`${setup.worktree}\` (cd there; use absolute paths under it).\n` +
    `Implement ${featureDesc} per your feature-dev rules (strict TDD, CLAUDE.md conventions). ` +
    `Self-verify with \`bash .claude/hooks/gate.sh\` until green, then commit on this branch — no push, no merge.${fixNote}`,
    { label: `develop:attempt-${attempt}`, phase: 'Develop', schema: DEV, agentType: 'feature-dev' },
  )
  if (!dev || !dev.gatePassed) {
    log(`attempt ${attempt}: gate not green — ${dev ? dev.summary : 'agent failed'}`)
    attempt++
    continue
  }

  phase('Review')
  review = await workflow('multi-review', { base, worktree: setup.worktree, depth })
  if (review && review.gate === 'pass') break
  blockers = review && review.blockers ? review.blockers : []
  log(`attempt ${attempt}: review found ${blockers.length} blocker(s)`)
  attempt++
}

// ---- step 3: deterministic decision ------------------------------------
phase('Integrate')
const passed = !!(review && review.gate === 'pass')

if (passed) {
  const advisory = review.advisory || []
  const advisoryMd = advisory.length
    ? advisory.map((a) => `- **[${a.lens}]** ${a.title} — \`${a.file}${a.line ? ':' + a.line : ''}\`\n  ${a.detail}`).join('\n')
    : 'No advisory findings.'

  const integrate = await agent(
    `You are the integrator. The feature on branch \`${setup.branch}\` passed review. Do EXACTLY this, no improvisation:\n\n` +
    `STEP 1 — write the advisory report INTO the worktree and commit it there so it travels with the merge:\n` +
    `  - Write this markdown to \`${setup.worktree}/${reportFile}\`:\n` +
    `    ----\n    # Advisory review — ${setup.branch}\n\n    Gate: pass (depth=${depth}). Blocking findings: none.\n\n    ## Advisory (non-blocking)\n${advisoryMd}\n    ----\n` +
    `  - Then: \`git -C "${setup.worktree}" add ${reportFile} && git -C "${setup.worktree}" commit -m "docs: advisory review for ${setup.branch}"\`\n\n` +
    `STEP 2 — run this as a SINGLE bash script from the main checkout (env vars don't persist across separate calls, so keep it one block):\n` +
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
    reportFile,
    advisory,
  }
}

// failed after retries: leave worktree intact, desktop-notify
const why = review ? `${blockers.length} blocker(s) after ${attempt} attempts` : `gate never green after ${attempt} attempts`
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
  blockers,
}
