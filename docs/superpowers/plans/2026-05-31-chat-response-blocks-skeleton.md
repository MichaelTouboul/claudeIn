# Chat-Response Block System — Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat `<pre>` rendering of chat responses with an extensible, registry-based block system so responses render real markdown today and rich interactive blocks can be added in parallel later.

**Architecture:** A `ResponseBody` component renders a message's content through `react-markdown`, whose `components` prop is the open **markdown-level registry**. Each markdown node type maps to a block component wrapped in a shared `BlockShell` (frame + hover toolbar). Blocks declare actions (`local` now, `claude` deferred). This skeleton freezes the shared seam (`BlockShell`, `blockRegistry`, the `BlockProps`/`BlockAction` contract); the four rich blocks (Shiki Code, MUI Table, Diff, Image) become parallel follow-on plans built on it.

**Tech Stack:** React 19, TypeScript, `react-markdown@10` (already installed) + `remark-gfm` (tables), Vitest + React Testing Library (new), CSS-var design system.

**Scope note:** This plan delivers the skeleton + a minimal reference `CodeBlock` proving the contract end-to-end. It does NOT implement Shiki, MUI DataGrid, `react-diff-view`, Claude-powered transforms, or the per-block error boundary (spec "Error handling") — those are parallel follow-on plans listed at the end. The skeleton ships only the reference CodeBlock, so error-boundary risk is minimal until rich blocks land.

**Spec:** `docs/superpowers/specs/2026-05-31-chat-response-blocks-design.md`

**Verification reality:** The project has no test runner today; its gate is `npm run lint` (0 errors AND 0 warnings) + `npm run typecheck` + `npx electron-vite build`. This plan adds Vitest for the pure-logic/component seams and keeps the existing gate for integration. Every task ends green on both.

---

## File structure

```
src/components/ResponseBody/                ← NEW. Root component (used by AgentChat + SessionViewer)
  ResponseBody.tsx                          ← wires react-markdown + registry
  responseBody.types.ts                     ← BlockProps / BlockAction contract
  blockRegistry.tsx                         ← open registry → react-markdown `components` map
  blockRegistry.test.tsx
  BlockShell/
    BlockShell.tsx                          ← shared chrome: frame + hover toolbar from registered actions
    BlockShell.test.tsx
  blocks/
    CodeBlock/
      CodeBlock.tsx                          ← reference block (styled <pre> + Copy action) — Shiki comes later
      CodeBlock.test.tsx
  ResponseBody.test.tsx
vitest.config.ts                            ← NEW
vitest.setup.ts                             ← NEW
```

Modified: `package.json` (deps + scripts), `src/components/AgentChat/MessageRow/MessageRow.tsx`, `src/components/SessionViewer/SessionViewer.tsx`, `src/CLAUDE.md`.

---

## Task 1: Test runner + markdown deps

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm i remark-gfm
npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom
```
Expected: deps added, no errors. (`react-markdown` is already present.)

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Add scripts to `package.json`**

Add to the `"scripts"` block:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Add a smoke test to verify the runner works**

Create `src/components/ResponseBody/smoke.test.ts`:
```ts
import { describe, expect, it } from 'vitest';

describe('vitest', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm run test`
Expected: 1 passed.

- [ ] **Step 6: Delete the smoke test and commit**

```bash
rm src/components/ResponseBody/smoke.test.ts
git add package.json package-lock.json vitest.config.ts vitest.setup.ts
git commit -m "build(test): add vitest + RTL, remark-gfm for markdown"
```

---

## Task 2: Block contract types

**Files:**
- Create: `src/components/ResponseBody/responseBody.types.ts`

- [ ] **Step 1: Write the contract**

```ts
/** An action a block exposes in the BlockShell toolbar. */
export type BlockAction =
  | { id: string; label: string; kind: 'local'; run: () => void }
  | { id: string; label: string; kind: 'claude'; prompt: (raw: string) => string };

/** Props every block component receives. `TData` is the parsed payload. */
export type BlockProps<TData = unknown> = {
  data: TData;
  /** Original source string — rendered as a fallback by the error boundary. */
  raw: string;
  /** Lets a block publish its toolbar actions to the enclosing BlockShell. */
  registerActions: (actions: BlockAction[]) => void;
};
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ResponseBody/responseBody.types.ts
git commit -m "feat(blocks): block contract types (BlockProps, BlockAction)"
```

---

## Task 3: BlockShell (shared chrome + toolbar)

**Files:**
- Create: `src/components/ResponseBody/BlockShell/BlockShell.test.tsx`
- Create: `src/components/ResponseBody/BlockShell/BlockShell.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { BlockAction } from '../responseBody.types';
import { BlockShell } from './BlockShell';

describe('BlockShell', () => {
  it('renders children and a button per registered action; clicking a local action runs it', () => {
    const run = vi.fn();
    const actions: BlockAction[] = [{ id: 'copy', label: 'Copy', kind: 'local', run }];

    function Consumer() {
      return (
        <BlockShell>
          {(register) => {
            register(actions);
            return <div>body</div>;
          }}
        </BlockShell>
      );
    }

    render(<Consumer />);
    expect(screen.getByText('body')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(run).toHaveBeenCalledOnce();
  });

  it('renders claude actions as disabled (deferred)', () => {
    const actions: BlockAction[] = [
      { id: 'tr', label: 'Translate', kind: 'claude', prompt: (r) => r },
    ];
    render(
      <BlockShell>
        {(register) => {
          register(actions);
          return <div>body</div>;
        }}
      </BlockShell>
    );
    expect(screen.getByRole('button', { name: 'Translate' })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- BlockShell`
Expected: FAIL — cannot find `./BlockShell`.

- [ ] **Step 3: Implement BlockShell**

```tsx
import { type ReactNode, useState } from 'react';

import type { BlockAction } from '../responseBody.types';

export type BlockShellProps = {
  /** Render-prop: receives `register` so the block can publish its actions, returns the block body. */
  children: (register: (actions: BlockAction[]) => void) => ReactNode;
};

export function BlockShell({ children }: BlockShellProps) {
  const [actions, setActions] = useState<BlockAction[]>([]);
  const body = children(setActions);

  return (
    <div className="group relative my-2 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
      {actions.length > 0 ? (
        <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {actions.map((a) => (
            <button
              key={a.id}
              disabled={a.kind === 'claude'}
              onClick={a.kind === 'local' ? a.run : undefined}
              title={a.kind === 'claude' ? 'Coming soon' : a.label}
              className="rounded px-2 py-1 text-xs font-medium disabled:opacity-40"
              style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-secondary)' }}
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
      {body}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- BlockShell`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ResponseBody/BlockShell
git commit -m "feat(blocks): BlockShell chrome with hover action toolbar"
```

---

## Task 4: Reference CodeBlock (proves the contract)

**Files:**
- Create: `src/components/ResponseBody/blocks/CodeBlock/CodeBlock.test.tsx`
- Create: `src/components/ResponseBody/blocks/CodeBlock/CodeBlock.tsx`

This is the minimal reference block: a styled `<pre>` + a `Copy` local action. Shiki highlighting is the follow-on plan; this proves registry → BlockShell → action wiring end-to-end.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CodeBlock } from './CodeBlock';

describe('CodeBlock', () => {
  it('renders the code text and a Copy action', () => {
    render(<CodeBlock data={{ lang: 'ts', src: 'const x = 1;' }} raw="const x = 1;" />);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('shows the language label when present', () => {
    render(<CodeBlock data={{ lang: 'python', src: 'x = 1' }} raw="x = 1" />);
    expect(screen.getByText('python')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- CodeBlock`
Expected: FAIL — cannot find `./CodeBlock`.

- [ ] **Step 3: Implement CodeBlock**

```tsx
import { BlockShell } from '../../BlockShell/BlockShell';
import type { BlockAction } from '../../responseBody.types';

export type CodeBlockData = { lang: string | null; src: string };
export type CodeBlockProps = { data: CodeBlockData; raw: string };

// `raw` stays on CodeBlockProps for contract uniformity but is unused in this
// reference block, so it is not destructured (no unused-var lint error).
export function CodeBlock({ data }: CodeBlockProps) {
  const copy: BlockAction = {
    id: 'copy',
    label: 'Copy',
    kind: 'local',
    run: () => void navigator.clipboard?.writeText(data.src),
  };

  return (
    <BlockShell>
      {(register) => {
        register([copy]);
        return (
          <div>
            {data.lang ? (
              <div
                className="px-3 pt-2 text-xs font-mono"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {data.lang}
              </div>
            ) : null}
            <pre
              className="overflow-x-auto px-3 pb-3 pt-1 text-sm leading-relaxed"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}
            >
              <code>{data.src}</code>
            </pre>
          </div>
        );
      }}
    </BlockShell>
  );
}
```

- [ ] **Step 4: Run test + lint to verify**

Run: `npm run test -- CodeBlock`
Expected: PASS (2 tests).
Run: `npm run lint`
Expected: 0 errors, 0 warnings (no unused `raw`).

- [ ] **Step 5: Commit**

```bash
git add src/components/ResponseBody/blocks/CodeBlock
git commit -m "feat(blocks): reference CodeBlock (styled pre + Copy action)"
```

---

## Task 5: blockRegistry (react-markdown components map)

**Files:**
- Create: `src/components/ResponseBody/blockRegistry.test.tsx`
- Create: `src/components/ResponseBody/blockRegistry.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';

import { blockComponents } from './blockRegistry';

function renderMd(src: string) {
  return render(
    <Markdown remarkPlugins={[remarkGfm]} components={blockComponents}>
      {src}
    </Markdown>
  );
}

describe('blockRegistry', () => {
  it('routes a fenced code block to CodeBlock (Copy action present)', () => {
    renderMd('```ts\nconst x = 1;\n```');
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('renders inline code without a Copy action', () => {
    renderMd('this is `inline` code');
    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument();
  });

  it('renders a GFM table as a real <table>', () => {
    renderMd('| a | b |\n| - | - |\n| 1 | 2 |');
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- blockRegistry`
Expected: FAIL — cannot find `./blockRegistry`.

- [ ] **Step 3: Implement the registry**

```tsx
import { type ComponentPropsWithoutRef } from 'react';
import type { Components } from 'react-markdown';

import { CodeBlock } from './blocks/CodeBlock/CodeBlock';

/** Detect a fenced block-code's language from react-markdown's `language-xxx` className. */
function langFromClassName(className: string | undefined): string | null {
  const match = /language-(\w+)/.exec(className ?? '');
  return match ? match[1] : null;
}

function Code({ className, children, ...props }: ComponentPropsWithoutRef<'code'>) {
  const lang = langFromClassName(className);
  const src = String(children ?? '').replace(/\n$/, '');
  // Inline code has no language class and no newline → render plainly.
  const isInline = lang === null && !src.includes('\n');
  if (isInline) {
    return (
      <code
        className="rounded px-1 py-0.5 text-sm"
        style={{ background: 'var(--color-surface-3)', fontFamily: 'var(--font-mono)' }}
        {...props}
      >
        {children}
      </code>
    );
  }
  return <CodeBlock data={{ lang, src }} raw={src} />;
}

/** The open markdown-level registry. To add a block type, add an entry here. */
export const blockComponents: Components = {
  code: Code,
  // table/img/etc. fall back to react-markdown defaults until their rich blocks land.
};
```

Note on react-markdown v10: block code arrives wrapped in `<pre><code class="language-xxx">`. Because `CodeBlock` renders its own `<pre>`, also override `pre` to avoid a nested `<pre><pre>`:

Add to the registry:
```tsx
  pre: ({ children }: ComponentPropsWithoutRef<'pre'>) => <>{children}</>,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- blockRegistry`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ResponseBody/blockRegistry.tsx src/components/ResponseBody/blockRegistry.test.tsx
git commit -m "feat(blocks): open markdown registry (code routing + GFM tables)"
```

---

## Task 6: ResponseBody (the wrapper)

**Files:**
- Create: `src/components/ResponseBody/ResponseBody.test.tsx`
- Create: `src/components/ResponseBody/ResponseBody.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ResponseBody } from './ResponseBody';

describe('ResponseBody', () => {
  it('renders markdown content (heading + table + code) as structured elements', () => {
    const content = '# Title\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n```ts\nconst x = 1;\n```';
    render(<ResponseBody content={content} />);
    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- ResponseBody`
Expected: FAIL — cannot find `./ResponseBody`.

- [ ] **Step 3: Implement ResponseBody**

```tsx
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { blockComponents } from './blockRegistry';

export type ResponseBodyProps = { content: string };

export function ResponseBody({ content }: ResponseBodyProps) {
  return (
    <div className="text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
      <Markdown remarkPlugins={[remarkGfm]} components={blockComponents}>
        {content}
      </Markdown>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- ResponseBody`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ResponseBody/ResponseBody.tsx src/components/ResponseBody/ResponseBody.test.tsx
git commit -m "feat(blocks): ResponseBody renders message content via the registry"
```

---

## Task 7: Wire ResponseBody into MessageRow and SessionViewer

**Files:**
- Modify: `src/components/AgentChat/MessageRow/MessageRow.tsx`
- Modify: `src/components/SessionViewer/SessionViewer.tsx`

Replace the assistant/agent `<pre>{renderContentWithImages(...)}</pre>` rendering with `<ResponseBody content={...} />`. User and tool rows keep their current plain rendering (they are not markdown).

- [ ] **Step 1: Update MessageRow's agent branch**

In `MessageRow.tsx`, add the import:
```tsx
import { ResponseBody } from '@/components/ResponseBody/ResponseBody';
```
Replace the agent-message `<pre>` (the final `return` block's content `<pre className={...}>{renderContentWithImages(msg.content)}</pre>`) with:
```tsx
<div className="ml-5">
  <ResponseBody content={msg.content} />
</div>
```
Leave the `isUser` and `isTool` branches unchanged.

- [ ] **Step 2: Update SessionViewer's assistant rendering**

In `SessionViewer.tsx`, add the import:
```tsx
import { ResponseBody } from '@/components/ResponseBody/ResponseBody';
```
Find the block that renders an assistant/agent message body with `renderContentWithImages(...)` inside a `<pre>` and replace that `<pre>...</pre>` with:
```tsx
<ResponseBody content={message.content} />
```
(Use the local variable name the surrounding `.map` uses for the message; keep user/tool branches as-is.)

- [ ] **Step 3: Verify build + lint + typecheck**

Run: `npm run typecheck`
Expected: 0 errors.
Run: `npm run lint`
Expected: 0 errors, 0 warnings. (If `renderContentWithImages` is now unused in a file, remove its import.)
Run: `npx electron-vite build`
Expected: build succeeds.

- [ ] **Step 4: Manual check**

Run: `npm run dev`. Open an agent chat / session viewer with a response containing a markdown table and a code fence. Confirm the table renders as a table and code renders in a framed block with a Copy button on hover.

- [ ] **Step 5: Commit**

```bash
git add src/components/AgentChat/MessageRow/MessageRow.tsx src/components/SessionViewer/SessionViewer.tsx
git commit -m "feat(chat): render responses via ResponseBody (markdown + blocks)"
```

---

## Task 8: Document the design-system exception

**Files:**
- Modify: `src/CLAUDE.md`

- [ ] **Step 1: Add the interactive-block exception under the Design system section**

After the design-system rules in `src/CLAUDE.md`, add:
```markdown
- **Interactive block exception:** components under `components/ResponseBody/blocks/` MAY embed a third-party UI library (e.g. MUI DataGrid, Shiki) behind `BlockShell`. Bridge the library's theme to the CSS-var tokens. This is the ONE place the "no styles outside the design system" rule is relaxed; everywhere else still uses the CSS-var system.
```

- [ ] **Step 2: Commit**

```bash
git add src/CLAUDE.md
git commit -m "docs: allow third-party UI libs inside ResponseBody blocks"
```

---

## Follow-on plans (parallelizable — built on the frozen skeleton)

Each becomes its own `docs/superpowers/plans/` file and a separate worktree. They touch only their own `blocks/<X>/` folder + one registration line in `blockRegistry.tsx` + `package.json`:

1. **CodeBlock → Shiki** — replace the styled `<pre>` with Shiki highlighting themed to CSS-vars; add `Format` (prettier, local) and `Convert to…` / `Explain` (claude) actions.
2. **TableBlock (MUI DataGrid)** — register a `table` override; column remove/recolor/sort/export; MUI→CSS-var theme bridge.
3. **DiffBlock (`react-diff-view`)** — route fenced ` ```diff ` language in the registry's `Code` router to a split/unified diff renderer.
4. **ImageBlock** — register an `img` override with click-to-zoom; supersede `renderContentWithImages` for raw image URLs.
5. **Claude transform engine** — add a one-shot `claude --print` IPC (`window.api.runBlockTransform`) + `transforms/runClaudeTransform.ts`; enable `kind: 'claude'` actions (currently rendered disabled in `BlockShell`).
6. **Per-block error boundary** (spec "Error handling") — a `BlockErrorBoundary` (class component) wrapping each block inside `BlockShell`; on error, fall back to `<pre>{raw}</pre>`. Deferred from the skeleton since only the reference CodeBlock ships there.
```
