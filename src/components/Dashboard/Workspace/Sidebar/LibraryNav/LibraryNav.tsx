import { Boxes, ChevronLeft, ChevronRight } from 'lucide-react';

import type { AgentSummary, SkillSummary } from '@/lib/types';
import { useDashboardStore } from '@/store/dashboard/useDashboardStore';
import { LibraryCategory, useDashboardUIStore } from '@/store/dashboard/useDashboardUIStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { CATEGORY_META, CATEGORY_ORDER } from './categoryMeta';
import { LibraryCategoryDetail } from './LibraryCategoryDetail';

export type LibraryNavProps = {
  onAgentAction: (action: string, agentName: string) => void;
  onNewAgent: () => void;
};

/**
 * Library mode of the sidebar switch: a category nav (Agents / Skills / Hooks /
 * MCP, each with the zone icon + a mono count) above a hint bar, drilling into
 * the EXISTING list components via LibraryCategoryDetail with a back bar. View
 * state (which category is drilled into) lives in useDashboardUIStore so it
 * survives the sidebar unmounting.
 */
export function LibraryNav({ onAgentAction, onNewAgent }: LibraryNavProps) {
  const agents = useDashboardStore((s) => s.agents);
  const skills = useDashboardStore((s) => s.skills);
  const hooks = useDashboardStore((s) => s.hooks);
  const mcp = useDashboardStore((s) => s.mcp);

  const selectedAgent = useDashboardUIStore((s) => s.selectedAgent);
  const selectedSkill = useDashboardUIStore((s) => s.selectedSkill);
  const scopeTab = useDashboardUIStore((s) => s.scopeTab);
  const category = useDashboardUIStore((s) => s.libraryCategory);
  const setCategory = useDashboardUIStore((s) => s.setLibraryCategory);
  const setScopeTab = useDashboardUIStore((s) => s.setScopeTab);

  const addTab = useWorkspaceStore((s) => s.addTab);
  const onSelectAgent = (a: AgentSummary) => addTab({ kind: 'agent', title: a.id, agentName: a.id });
  const onSelectSkill = (s: SkillSummary) => addTab({ kind: 'skill', title: s.name, skillId: s.filePath });

  const counts: Record<LibraryCategory, number> = {
    [LibraryCategory.Agents]: agents.length,
    [LibraryCategory.Skills]: skills.length,
    [LibraryCategory.Hooks]: hooks.length,
    [LibraryCategory.Mcp]: mcp.length,
  };

  if (category) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium shrink-0 hover:bg-surface-2"
          style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border-subtle)' }}
        >
          <ChevronLeft size={14} />
          {CATEGORY_META[category].label}
        </button>
        <div className="flex-1 overflow-y-auto min-h-0">
          <LibraryCategoryDetail
            category={category}
            agents={agents}
            skills={skills}
            hooks={hooks}
            mcp={mcp}
            selectedAgentId={selectedAgent?.id ?? null}
            selectedSkillPath={selectedSkill?.filePath ?? null}
            scopeTab={scopeTab}
            onScopeChange={setScopeTab}
            onSelectAgent={onSelectAgent}
            onSelectSkill={onSelectSkill}
            onAgentAction={onAgentAction}
            onNewAgent={onNewAgent}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 pt-1">
      <div
        className="flex items-center gap-2 mx-2 mb-2 px-3 py-2 rounded-md text-xs leading-snug"
        style={{
          background: 'var(--color-accent-subtle)',
          border: '1px solid var(--color-accent-border)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <Boxes size={15} className="shrink-0" style={{ color: 'var(--color-accent-text)' }} />
        Browse your library — your chat stays open on the right.
      </div>

      {CATEGORY_ORDER.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => setCategory(cat)}
          className="flex items-center gap-2.5 w-full h-10 px-3 mx-0 text-sm text-left hover:bg-surface-2"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span className="flex shrink-0">{CATEGORY_META[cat].icon}</span>
          <span className="flex-1">{CATEGORY_META[cat].label}</span>
          <span className="font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {counts[cat]}
          </span>
          <ChevronRight size={15} style={{ color: 'var(--color-text-muted)' }} />
        </button>
      ))}
    </div>
  );
}
