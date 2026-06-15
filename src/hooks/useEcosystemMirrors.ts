import { useEffect, useState } from "react";

import type { AgentSummary, MemoryEntry, SkillSummary } from "@/lib/types";

/** Async load state for an ecosystem mirror (skills / agents / memory). */
export type MirrorStatus = "loading" | "ready";

export type SkillsMirror = { status: MirrorStatus; skills: SkillSummary[] };
export type AgentsMirror = { status: MirrorStatus; agents: AgentSummary[] };
export type MemoryMirror = { status: MirrorStatus; entries: MemoryEntry[] };

/**
 * Live skills mirror for the active repo scope. Refetches whenever the scope
 * changes and stays fresh via the `onSkillsChanged` push subscription.
 */
export function useSkillsMirror(repoScope: string | null): SkillsMirror {
  const [state, setState] = useState<SkillsMirror>({ status: "loading", skills: [] });
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: "loading" }));
    void window.api.getSkillsMirror(repoScope ?? undefined).then((snap) => {
      if (!cancelled) setState({ status: "ready", skills: snap.skills });
    });
    const off = window.api.onSkillsChanged((snap) =>
      setState({ status: "ready", skills: snap.skills }),
    );
    return () => {
      cancelled = true;
      off();
    };
  }, [repoScope]);
  return state;
}

/**
 * Live sub-agents mirror for the active repo scope. Same refetch-on-scope +
 * push-subscription contract as `useSkillsMirror`.
 */
export function useAgentsMirror(repoScope: string | null): AgentsMirror {
  const [state, setState] = useState<AgentsMirror>({ status: "loading", agents: [] });
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: "loading" }));
    void window.api.getAgentsMirror(repoScope ?? undefined).then((snap) => {
      if (!cancelled) setState({ status: "ready", agents: snap.agents });
    });
    const off = window.api.onAgentsChanged((snap) =>
      setState({ status: "ready", agents: snap.agents }),
    );
    return () => {
      cancelled = true;
      off();
    };
  }, [repoScope]);
  return state;
}

/**
 * Live memory mirror (CLAUDE.md hierarchy + auto-memory) for the active scope.
 * Same refetch-on-scope + push-subscription contract as the others.
 */
export function useMemoryMirror(repoScope: string | null): MemoryMirror {
  const [state, setState] = useState<MemoryMirror>({ status: "loading", entries: [] });
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: "loading" }));
    void window.api.getMemoryMirror(repoScope ?? undefined).then((snap) => {
      if (!cancelled) setState({ status: "ready", entries: snap.entries });
    });
    const off = window.api.onMemoryChanged((snap) =>
      setState({ status: "ready", entries: snap.entries }),
    );
    return () => {
      cancelled = true;
      off();
    };
  }, [repoScope]);
  return state;
}
