export const meta = {
  name: 'codebase-health-sweep',
  description:
    'Periodic code-health sweep of the renderer: _ui promotion, layout adoption, accessibility, state/context homes, dead-code. Each phase audits → adversarially verifies → auto-fixes in an isolated worktree (gate + merge --no-ff + push) → reports. Mechanical/safe fixes are applied; architectural/design-sensitive judgment calls are reported, never applied. Runs phases sequentially so each rebases on the prior merge. Parameterizable: pass an array of phase keys to run a subset.',
  phases: [
    { title: 'Preflight' },
    { title: '_ui primitives' },
    { title: 'Layout' },
    { title: 'Accessibility' },
    { title: 'State & contexts' },
    { title: 'Dead code' },
    { title: 'Report' },
  ],
}

// ---- phase selection (args = array of keys; default = all, in order) ----
const ALL = ['ui', 'layout', 'accessibility', 'state', 'dead-code']
const want = Array.isArray(args) && args.length ? args : ALL
const enabled = (k) => want.includes(k)

// ---- shared contract injected into every fix agent ----
const GATE =
  '`npm run typecheck` (0 errors) + `npm run lint` (0 errors AND 0 warnings) + `npx electron-vite build` + `npm test` (all green)'

const RULES = `
RULES (non-negotiable):
- Work in your isolated git worktree. Do NOT symlink node_modules — if a dep is missing run \`npm install --legacy-peer-deps\` (npm ci may be sandbox-denied).
- Follow CLAUDE.md / src/CLAUDE.md exactly. NO raw values: colors and common px (spacing/radius) are centralized as tokens in src/index.css — never hardcode.
- Gate = ${GATE}.
- If the gate is green: commit with a conventional message ending with "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"; from the main repo checkout \`git fetch\`, merge origin/main into your branch if it advanced, re-gate, then \`git merge --no-ff\` into main and \`git push\` (perso SSH remote).
- If the gate fails OR a merge conflicts OR a push is rejected: STOP, force nothing, leave the branch intact, and return applied=false with the reason in skippedReason.
- AUTONOMY: apply ONLY mechanical, unambiguous, safe fixes. NEVER apply an architectural or design-sensitive judgment call autonomously (e.g. converting a store to context, a tablist-vs-launcher choice, a whole-palette token-value change, moving page structure). Collect each such item as a short string in judgmentCalls[] for the human — do not apply it.
- Be surgical; preserve behavior, props, handlers, a11y, and the CSS-var design system.`

const FINDINGS = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          location: { type: 'string', description: 'file:line' },
          recommendation: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          judgmentCall: {
            type: 'boolean',
            description: 'true if applying needs a human architectural/design decision',
          },
        },
        required: ['id', 'location', 'recommendation', 'confidence', 'judgmentCall'],
      },
    },
  },
  required: ['summary', 'items'],
}

const PHASE_RESULT = {
  type: 'object',
  additionalProperties: false,
  properties: {
    applied: { type: 'boolean' },
    commit: { type: ['string', 'null'], description: 'merge commit hash if pushed, else null' },
    pushed: { type: 'boolean' },
    sitesChanged: { type: 'integer' },
    summary: { type: 'string' },
    skippedReason: { type: ['string', 'null'] },
    judgmentCalls: { type: 'array', items: { type: 'string' } },
  },
  required: ['applied', 'commit', 'pushed', 'sitesChanged', 'summary', 'skippedReason', 'judgmentCalls'],
}

// ---- preflight: refuse to sweep on a red or dirty baseline ----
phase('Preflight')
const PRE = {
  type: 'object',
  additionalProperties: false,
  properties: {
    clean: { type: 'boolean' },
    onMain: { type: 'boolean' },
    baselineGreen: { type: 'boolean' },
    head: { type: 'string' },
    note: { type: 'string' },
  },
  required: ['clean', 'onMain', 'baselineGreen', 'head', 'note'],
}
const pre = await agent(
  `Pre-sweep health check (READ-ONLY, change nothing). Confirm: the repo is on branch \`main\` and the working tree is clean; then run the gate (${GATE}) and report whether the baseline is green; report the HEAD commit. If dirty / not on main / baseline red, set the relevant flag false and explain in note. Do NOT symlink node_modules; npm install --legacy-peer-deps only if needed.`,
  { label: 'preflight', phase: 'Preflight', schema: PRE },
)
if (!pre || !pre.clean || !pre.onMain || !pre.baselineGreen) {
  log(`Preflight failed (clean=${pre?.clean} onMain=${pre?.onMain} green=${pre?.baselineGreen}) — aborting sweep.`)
  return { aborted: true, reason: pre?.note ?? 'preflight failed', pre }
}
log(`Preflight OK at ${pre.head} — sweeping phases: ${want.join(', ')}`)

const results = []

// ---- generic audit → verify → fix phase ----
async function runPhase({ key, title, auditAgentType, auditPrompt, fixPrompt }) {
  if (!enabled(key)) {
    log(`${title}: skipped (not in scope)`)
    return null
  }
  phase(title)
  const findings = await agent(auditPrompt, {
    agentType: auditAgentType,
    label: `audit:${key}`,
    phase: title,
    schema: FINDINGS,
  })
  const verified = await agent(
    `Adversarially verify these "${title}" audit findings against the ACTUAL current code. Drop false positives, anything ambiguous, and anything that is not mechanically safe to auto-apply. Keep only high-confidence, surgical items; mark judgmentCall=true (and keep, but flag) for design/architectural items. Return the filtered findings.\n\nFindings:\n${JSON.stringify(findings)}`,
    { label: `verify:${key}`, phase: title, schema: FINDINGS },
  )
  const res = await agent(`${fixPrompt}\n\nVerified findings:\n${JSON.stringify(verified)}\n${RULES}`, {
    label: `fix:${key}`,
    phase: title,
    isolation: 'worktree',
    schema: PHASE_RESULT,
  })
  const r = res ?? {
    applied: false, commit: null, pushed: false, sitesChanged: 0,
    summary: 'fix agent returned no result', skippedReason: 'agent died/skipped', judgmentCalls: [],
  }
  results.push({ phase: title, ...r })
  log(`${title}: ${r.applied ? `merged ${r.commit} (${r.sitesChanged} sites)` : `no merge — ${r.skippedReason}`}`)
  return r
}

// 1 — _ui primitives
await runPhase({
  key: 'ui',
  title: '_ui primitives',
  auditAgentType: 'ui-promotion-finder',
  auditPrompt:
    'Audit src/components for reusable primitive candidates (buttons, inputs, spans/badges, status dots, items/rows) that should be a generic, domain-free `_ui/` primitive or a variant of an existing one. Classify each as (A) variant-coverable vs (B) over-coding/leave-raw. Report only (A) items as actionable; mark anything that creates a NEW primitive contract as judgmentCall=true.',
  fixPrompt:
    'Apply the verified `_ui` promotion findings: create missing generic primitives (Radix+cva+cn, CSS-var tokens, barrel) and/or adopt existing primitives at the call sites, removing hardcoded colors. Skip (B) items. Creating a brand-new primitive API is a judgmentCall — only do trivially-obvious ones, report the rest.',
})

// 2 — layout
await runPhase({
  key: 'layout',
  title: 'Layout',
  auditAgentType: 'layout-candidate-finder',
  auditPrompt:
    'Audit src for hand-written Tailwind layout that should adopt the `_ui/` Flex/Stack/Inline/Grid primitives. Only (A) clean, fully prop-expressible sites are actionable; (B) sites (flex-1/min-h-0/overflow shells, responsive, arbitrary values, gap-x/y split, inline-flex chips) stay raw.',
  fixPrompt:
    'Adopt Flex/Stack/Inline/Grid at the verified (A) sites, preserving non-layout classes + aria/style/handlers via passthrough. If the primitives do not yet exist, create them first (cva+cn, gap scale incl. half-steps 0|0.5|1|1.5|2|2.5|3|4|6|8, polymorphic `as`). Leave all (B) sites raw.',
})

// 3 — accessibility (two read-only auditors in parallel, then one fix)
if (enabled('accessibility')) {
  phase('Accessibility')
  const [contrast, aria] = await parallel([
    () =>
      agent(
        'Run the accessibility-audit skill focused on COLOR CONTRAST: compute WCAG 2.1 AA contrast ratios from the src/index.css design tokens for the real fg/bg pairings + any hardcoded colors; flag failures with suggested compliant token values. Also run the jsx-a11y static pass. Mark whole-palette token-VALUE changes as judgmentCall=true.',
        { agentType: 'accessibility-audit-runner', label: 'audit:contrast', phase: 'Accessibility', schema: FINDINGS },
      ),
    () =>
      agent(
        'Review src/components against the aria-requirements skill (tablist idiom, close-affordance escape hatch, modal Escape/labelled close, accessible names, keyboard operability). Report convention deviations the linter cannot catch. Mark tablist-vs-launcher and other structural choices as judgmentCall=true.',
        { agentType: 'aria-requirements-auditor', label: 'audit:aria', phase: 'Accessibility', schema: FINDINGS },
      ),
  ])
  const merged = { summary: 'contrast + aria', items: [...(contrast?.items ?? []), ...(aria?.items ?? [])] }
  const verified = await agent(
    `Adversarially verify these accessibility findings against the code; keep only mechanically-safe items (add aria-label/role, text-surface-0 on brand fills, tokenize hardcoded colors to EXISTING tokens). Mark palette token-value changes, border-approach changes, and tablist-vs-launcher as judgmentCall=true (keep but flag).\n\n${JSON.stringify(merged)}`,
    { label: 'verify:accessibility', phase: 'Accessibility', schema: FINDINGS },
  )
  const res = await agent(
    `Apply the verified accessibility fixes. AUTO-APPLY only the unambiguous ones: missing aria-labels/roles, the tablist idiom where a strip is clearly single-selection, listbox aria-label, \`text-white\`→\`text-surface-0\` on solid brand fills, and tokenizing hardcoded colors to EXISTING tokens. DO NOT autonomously change palette token VALUES (e.g. lightening a color for contrast) or pick a border approach — report those as judgmentCalls. \n\nVerified findings:\n${JSON.stringify(verified)}\n${RULES}`,
    { label: 'fix:accessibility', phase: 'Accessibility', isolation: 'worktree', schema: PHASE_RESULT },
  )
  const r = res ?? { applied: false, commit: null, pushed: false, sitesChanged: 0, summary: 'no result', skippedReason: 'agent died', judgmentCalls: [] }
  results.push({ phase: 'Accessibility', ...r })
  log(`Accessibility: ${r.applied ? `merged ${r.commit}` : `no merge — ${r.skippedReason}`}`)
} else {
  log('Accessibility: skipped (not in scope)')
}

// 4 — state homes & context placement
await runPhase({
  key: 'state',
  title: 'State & contexts',
  auditAgentType: 'state-home-finder',
  auditPrompt:
    'Audit state homes per the decision tree (useState/props → context for global+stable → zustand for app-global/high-frequency). Inventory every React context (createContext) and flag any living in src/store/ that should move to src/contexts/. Mark zustand→context conversions and other architectural reshuffles as judgmentCall=true; the context FOLDER relocation (store→contexts) is mechanical, not a judgment call.',
  fixPrompt:
    'Apply ONLY the mechanical state-home fixes: relocate React contexts out of src/store/ into src/contexts/ (rewrite @/store/<X>Context → @/contexts/<X>, fix the file\'s own relative imports, update src/CLAUDE.md to name src/contexts/). DO NOT convert any zustand store to context or vice-versa autonomously — report each as a judgmentCall.',
})

// 5 — dead code (always last; this agent both finds AND removes, gate-verified)
if (enabled('dead-code')) {
  phase('Dead code')
  const res = await agent(
    `Run a conservative dead-code sweep of src/: remove ONLY exports/components/files you can PROVE are unreferenced (no importer anywhere), gate-verifying after each batch. Anything uncertain → leave it and report as a judgmentCall. Also flag unused npm dependencies (report, don't remove).\n${RULES}`,
    { agentType: 'dead-code-sweeper', label: 'fix:dead-code', phase: 'Dead code', isolation: 'worktree', schema: PHASE_RESULT },
  )
  const r = res ?? { applied: false, commit: null, pushed: false, sitesChanged: 0, summary: 'no result', skippedReason: 'agent died', judgmentCalls: [] }
  results.push({ phase: 'Dead code', ...r })
  log(`Dead code: ${r.applied ? `merged ${r.commit}` : `no merge — ${r.skippedReason}`}`)
} else {
  log('Dead code: skipped (not in scope)')
}

// ---- consolidated report ----
phase('Report')
const judgmentCalls = results.flatMap((r) => (r.judgmentCalls ?? []).map((j) => `[${r.phase}] ${j}`))
const merged = results.filter((r) => r.applied)
log(`Sweep done: ${merged.length}/${results.length} phases merged; ${judgmentCalls.length} judgment calls for review.`)
return {
  startedAt: pre.head,
  scope: want,
  phases: results,
  merged: merged.map((r) => ({ phase: r.phase, commit: r.commit, sites: r.sitesChanged })),
  judgmentCalls,
}
