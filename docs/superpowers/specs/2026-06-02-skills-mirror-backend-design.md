# Skills mirror (backend) — design

**Date:** 2026-06-02
**Status:** Approved (design) — pending implementation
**Scope:** Backend only, additive. Twin of the agents mirror.

## Context

Third slice of the `~/.claude` live-mirror refactor. It is a **direct twin** of the agents
mirror (`2026-06-02-agents-mirror-backend-design.md`), applied to **skills**. Today skills are
read pull-only by `project.service.getProjectSkills` → `findSkillsInDir` (cached 60 s, no
watch); this adds the live `read + watch + broadcast` layer, additively.

## Inherited from the agents mirror (identical decisions)

- **Additive, backend-only.** Existing readers (`project.service.getProjectSkills`) untouched.
- **Union user + project**, project **shadows** user on name collision (shadowed kept, marked).
- **Lightweight summary live; heavy content on-demand** (body/annex not in the snapshot).
- **Pattern:** pure `skills.union.ts` + `skills.mirror.ts` (scan + watch + broadcast +
  `getSkillsMirror`); IPC `skills:mirror:*`; preload/env.d.ts/`src/types` re-export barrel.
  RAM-only snapshot (never DB); diff-guard before broadcast; reuse the existing `broadcast`
  `push-event` channel; resolve `HOME` at call time (testable via `process.env.HOME`).
- **Stable list order:** project skills first, then user, each sorted by `name` ascending.
- **Never throws** (faithful mirror): missing dir → empty; malformed `SKILL.md` → skipped.

## Skill-specific deltas (vs agents)

1. **Unit = a directory containing `SKILL.md`** (agents were `.md` files). Scan top-level
   subdirs of the skills dir that contain a `SKILL.md` — mirror `findSkillsInDir`/`countSkills`.
2. **Sources:** `~/.claude/skills/*/SKILL.md` (user) + `<projectPath>/.claude/skills/*/SKILL.md`
   (project, when `projectPath` given).
3. **Summary shape (lightweight):**
```ts
type SkillScope = 'user' | 'project';
interface SkillSummary {
  name: string;            // uniqueness key (frontmatter name || dir name)
  description: string;
  scope: SkillScope;
  filePath: string;        // the SKILL.md path
  metadata?: Record<string, unknown>;
  lineCount: number;
  shadowed: boolean;
}
interface SkillsSnapshot { projectPath: string | null; skills: SkillSummary[]; }
```
   No `body`, no annex-file contents — those stay on-demand via the existing reader.
4. **Watch:** `fs.watch` recursive on `~/.claude/skills/` + `<projectPath>/.claude/skills/`,
   filter to changes touching `SKILL.md` (or any change within a skill folder), debounce
   ~150 ms → re-scan → diff (`JSON.stringify`) → `broadcast({ type: 'skills_changed', snapshot })`.

## Union & shadowing (pure `skills.union.ts`)

Keyed by `name`. Project skill wins on collision (`shadowed: false`); the shadowed user skill
is kept with `shadowed: true`. No collision → all active. Order: project-then-user, each by
`name` asc. Unit-tested with no filesystem.

## IPC surface (`window.api`)

- `skills:mirror:get` → `getSkillsMirror(projectPath?): Promise<SkillsSnapshot>`
- `skills:mirror:watch` → `watchSkills(projectPath?): Promise<void>`
- `skills:mirror:unwatch` → `unwatchSkills(): Promise<void>`
- push `skills_changed` → `onSkillsChanged(cb): () => void` (filters `push-event` by type,
  mirroring `onAgentsChanged`).

Handlers in a `electron/ipc/skills.ipc.ts` (create it if no skills domain ipc exists; otherwise
add to it). Renderer type surfaced via `src/types/skills-mirror.types.ts` re-export barrel.

## Testing

- **`skills.union`** (pure): union user+project, project shadows user (flags + active
  selection), no collision → all active, empty inputs, stable order asserted.
- **`skills.mirror`** (temp dirs, `process.env.HOME` redirected): scan reads
  `*/SKILL.md` frontmatter into summaries, skips dirs without `SKILL.md`, omits heavy content;
  project scope adds project skills + applies shadowing; change event → broadcast
  (`vi.mock('./broadcast')`) with recomputed snapshot; identical content → no re-broadcast
  (diff guard); `unwatchSkills()` in `afterEach`.

## File layout

```
electron/types/skills-mirror.types.ts      ← SkillScope, SkillSummary, SkillsSnapshot
electron/services/skills.union.ts (+ .test) ← pure union + shadowing
electron/services/skills.mirror.ts (+ .test)← scan + union + watch + broadcast + getSkillsMirror
electron/ipc/skills.ipc.ts                   ← skills:mirror:get / :watch / :unwatch (create if absent)
electron/ipc/index.ts                        ← register if a new ipc file is created
electron/preload.ts + src/env.d.ts           ← getSkillsMirror / watchSkills / unwatchSkills / onSkillsChanged
src/types/skills-mirror.types.ts             ← renderer re-export barrel
```

Backend lint caveat (same as settings/agents): ESLint ignores `electron/**`, typecheck is
`src/`-scoped; the real backend gate is `npx electron-vite build` + Vitest; uphold
no-`any`/named-imports/300-line by hand.

## Out of scope (later)

- Renderer wiring.
- Full skill content (body/annex) in the live snapshot — stays on-demand.
- Unifying/removing the existing `getProjectSkills` reader.
- Provenance richer than `shadowed`.
- Memory / MCP mirrors.
```
