import { useEffect, useMemo, useState } from 'react';

import { useDashboardStore } from '@/store/useDashboardStore';

import { matchMentionQuery, matchSlashQuery } from '../RichEditor/serialize';
import { SLASH_COMMANDS } from '../slashRegistry';
import type { InputMenuGroup } from './InputMenu';

export type InputMenuKind = 'slash' | 'mention' | null;

export type UseInputMenusResult = {
  /** Which menu is open (mutually exclusive), or null. */
  kind: InputMenuKind;
  groups: InputMenuGroup[];
  activeIndex: number;
  /** Flattened item ids in render order (used to resolve the active selection). */
  flatIds: string[];
  /** Move highlight by delta, wrapping around. */
  move: (delta: number) => void;
  /** The currently highlighted item id, or null when no items. */
  activeId: string | null;
};

function buildSlashGroups(query: string): InputMenuGroup[] {
  const items = SLASH_COMMANDS.filter((c) => c.cmd.slice(1).startsWith(query)).map((c, i) => ({
    id: c.cmd,
    label: c.cmd,
    hint: c.desc,
    flatIndex: i,
  }));
  return items.length > 0 ? [{ key: 'slash', title: '', items }] : [];
}

/** Build the mention menu groups (Agents 🤖 / Skills 📦) filtered by `query`,
 *  assigning each item its flat index across both groups. */
function buildMentionGroups(query: string, agentNames: string[], skillNames: string[]): InputMenuGroup[] {
  const q = query.toLowerCase();
  const agents = agentNames.filter((n) => n.toLowerCase().includes(q));
  const skills = skillNames.filter((n) => n.toLowerCase().includes(q));
  const groups: InputMenuGroup[] = [];
  let flat = 0;
  if (agents.length > 0) {
    groups.push({
      key: 'agents',
      title: 'Agents',
      icon: '🤖',
      items: agents.map((n) => ({ id: n, label: n, flatIndex: flat++ })),
    });
  }
  if (skills.length > 0) {
    groups.push({
      key: 'skills',
      title: 'Skills',
      icon: '📦',
      items: skills.map((n) => ({ id: n, label: n, flatIndex: flat++ })),
    });
  }
  return groups;
}

/** Owns the slash/mention menu state for the chat input. Derives the open menu and its
 *  filtered, grouped items from the editor's plain text, and tracks keyboard highlight. */
export function useInputMenus(plainText: string): UseInputMenusResult {
  const agents = useDashboardStore((s) => s.agents);
  const skills = useDashboardStore((s) => s.skills);
  const [activeIndex, setActiveIndex] = useState(0);

  const slashQuery = matchSlashQuery(plainText);
  // Mention only when slash isn't claiming the token — they are mutually exclusive.
  const mentionQuery = slashQuery === null ? matchMentionQuery(plainText) : null;

  const agentNames = useMemo(() => agents.map((a) => a.frontmatter.name).filter(Boolean), [agents]);
  const skillNames = useMemo(() => skills.map((s) => s.name).filter(Boolean), [skills]);

  const groups = useMemo<InputMenuGroup[]>(() => {
    if (slashQuery !== null) return buildSlashGroups(slashQuery);
    if (mentionQuery !== null) return buildMentionGroups(mentionQuery, agentNames, skillNames);
    return [];
  }, [slashQuery, mentionQuery, agentNames, skillNames]);

  const flatIds = useMemo(() => groups.flatMap((g) => g.items.map((it) => it.id)), [groups]);

  // Reset highlight whenever the query token changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [slashQuery, mentionQuery]);

  const kind: InputMenuKind =
    groups.length === 0 ? null : slashQuery !== null ? 'slash' : 'mention';

  const move = (delta: number) => {
    if (flatIds.length === 0) return;
    setActiveIndex((i) => (i + delta + flatIds.length) % flatIds.length);
  };

  const activeId = flatIds.length > 0 ? flatIds[Math.min(activeIndex, flatIds.length - 1)] : null;

  return { kind, groups, activeIndex, flatIds, move, activeId };
}
