import { useEffect, useState } from "react";

import { CustomizeSection } from "@/store/customize/useCustomizeStore";

export type EcosystemCounts = Partial<Record<CustomizeSection, number>>;

/**
 * Aggregate per-section tallies for the Customize nav (skills / sub-agents /
 * hooks / memory) for the active repo scope. Refetches on scope change and
 * tracks the live `on*Changed` pushes so the nav counts stay accurate while the
 * page is open. Connectors keeps its own count from the MCP hook.
 */
export function useEcosystemCounts(repoScope: string | null): EcosystemCounts {
  const [counts, setCounts] = useState<EcosystemCounts>({});

  useEffect(() => {
    let cancelled = false;
    const scope = repoScope ?? undefined;
    const set = (section: CustomizeSection, n: number) => {
      if (!cancelled) setCounts((c) => ({ ...c, [section]: n }));
    };

    void window.api.getSkillsMirror(scope).then((s) => set(CustomizeSection.Skills, s.skills.length));
    void window.api.getAgentsMirror(scope).then((s) => set(CustomizeSection.Agents, s.agents.length));
    void window.api.getMemoryMirror(scope).then((s) => set(CustomizeSection.Memory, s.entries.length));
    void window.api.getHooks(scope).then((list) => set(CustomizeSection.Hooks, list.length));

    const offs = [
      window.api.onSkillsChanged((s) => set(CustomizeSection.Skills, s.skills.length)),
      window.api.onAgentsChanged((s) => set(CustomizeSection.Agents, s.agents.length)),
      window.api.onMemoryChanged((s) => set(CustomizeSection.Memory, s.entries.length)),
    ];
    return () => {
      cancelled = true;
      offs.forEach((off) => off());
    };
  }, [repoScope]);

  return counts;
}
