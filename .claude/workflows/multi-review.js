export const meta = {
  name: 'multi-review',
  description: 'Multi-lens review of the branch diff vs base; each finding adversarially verified before it counts',
  phases: [
    { title: 'Review' },
    { title: 'Verify' },
  ],
}

// Base to diff against — pass {base} via Workflow args, defaults to main.
const base = (args && args.base) || 'main'
// Worktree to review in — pass {worktree} so agents cd into the feature checkout
// (HEAD = the feature branch). Without it, agents run in the main checkout where
// HEAD = main and the diff would be empty.
const worktree = (args && args.worktree) || '.'
const cdNote = worktree === '.'
  ? ''
  : `First run \`cd ${worktree}\` so every git command and file read targets the feature worktree. `
const diffCmd = `git diff ${base}...HEAD`
// Cost controls:
//   depth 'light' (default) = only the blocking lenses (correctness + security).
//   depth 'full'            = all six lenses; advisory lenses reported unverified.
// Review/verify run on sonnet by default — enough for review, ~5x cheaper than opus.
const depth = (args && args.depth) || 'light'
const REVIEW_MODEL = (args && args.model) || 'sonnet'

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'file', 'detail', 'severity'],
        properties: {
          title: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'integer' },
          detail: { type: 'string' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor', 'nit'] },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['isReal', 'reason'],
  properties: {
    isReal: { type: 'boolean' },
    reason: { type: 'string' },
  },
}

const reviewPrompt = (focus, extra) =>
  `You are reviewing ONLY the changes in this branch.\n` +
  `${cdNote}Run \`${diffCmd} --stat\` then \`${diffCmd}\` to see the diff. Read surrounding code as needed.\n` +
  `Report findings about: ${focus}\n` +
  `${extra || ''}\n` +
  `RULES: report only — do NOT edit any file. Flag only issues that genuinely affect ${focus}; ` +
  `ignore style preferences and hypothetical cases. If nothing, return an empty findings array.`

// blocking lenses gate the merge; advisory lenses are reported only.
const LENSES = [
  { key: 'correctness', blocking: true, agentType: 'feature-dev:code-reviewer',
    prompt: reviewPrompt('correctness bugs, logic errors, race conditions, broken contracts') },
  { key: 'security', blocking: true,
    prompt: reviewPrompt('security vulnerabilities (injection, secrets in code, unsafe IPC, path traversal, auth flaws)') },
  { key: 'conventions', blocking: false,
    prompt: reviewPrompt('violations of CLAUDE.md conventions (no `any`, 300-line file limit, named exports only, `@/` imports, enum+behavior map over fallback chains)') },
  { key: 'accessibility', blocking: false,
    prompt: reviewPrompt('accessibility gaps in changed React components (roles, accessible names, keyboard operability)') },
  { key: 'state-home', blocking: false, agentType: 'state-home-finder',
    prompt: reviewPrompt('state that lives in the wrong home (useState/props vs React context vs zustand)') },
  { key: 'ui-promotion', blocking: false, agentType: 'ui-promotion-finder',
    prompt: reviewPrompt('feature components that should be promoted to `_ui/` primitives, or `_ui/` components leaking domain knowledge') },
]

// 'light' runs only the blocking lenses; 'full' runs all six.
const activeLenses = depth === 'full' ? LENSES : LENSES.filter((l) => l.blocking)

const results = await pipeline(
  activeLenses,
  (lens) => agent(lens.prompt, { label: `review:${lens.key}`, phase: 'Review', schema: FINDINGS_SCHEMA, agentType: lens.agentType, model: REVIEW_MODEL }),
  (review, lens) => {
    const findings = review && review.findings ? review.findings : []
    // Only blocking lenses (correctness + security) pay for adversarial
    // verification — a false positive in an advisory lens is noise, not a merge
    // block, so it isn't worth a second agent.
    if (!lens.blocking) {
      return findings.map((f) => ({ ...f, lens: lens.key, blocking: false, verdict: null }))
    }
    return parallel(findings.map((f) => () =>
      agent(
        `${cdNote}Adversarially verify this ${lens.key} finding against the diff (\`${diffCmd}\`). ` +
        `Read the actual code. Try to REFUTE it — default to isReal=false if you cannot confirm it from the diff.\n\n` +
        `Title: ${f.title}\nFile: ${f.file}${f.line ? ':' + f.line : ''}\nDetail: ${f.detail}`,
        { label: `verify:${lens.key}`, phase: 'Verify', schema: VERDICT_SCHEMA, model: REVIEW_MODEL },
      ).then((v) => ({ ...f, lens: lens.key, blocking: true, verdict: v }))))
  },
)

const all = results.flat().filter(Boolean)
// Blockers = blocking-lens findings the verifier confirmed real; refuted ones drop.
const blockers = all.filter((f) => f.blocking && f.verdict && f.verdict.isReal)
// Advisory = the non-blocking lenses' findings, reported as-is (unverified).
const advisory = all.filter((f) => !f.blocking)

log(`depth=${depth} model=${REVIEW_MODEL} · ${blockers.length} blocking, ${advisory.length} advisory`)

return {
  base,
  depth,
  gate: blockers.length === 0 ? 'pass' : 'fail',
  blockers,
  advisory,
}
