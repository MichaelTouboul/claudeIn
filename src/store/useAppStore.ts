import { create } from "zustand";

import type { UserProfile } from "@/types/user.types";

export type Project = {
  id: string;
  name: string;
  path: string;
  claudeDir: string;
  hasAgents: boolean;
  hasSkills: boolean;
  hasSettings: boolean;
  agentCount: number;
  skillCount: number;
};

/**
 * The three top-level pages. Single source of truth for what the `App` router
 * renders. Modeled as an `as const` enum so a behavior `Record` can map each
 * value to a page component (no fallback chains — per CLAUDE.md).
 */
export const AppPage = {
  Onboarding: "onboarding",
  Home: "home",
  Dashboard: "dashboard",
  Customize: "customize",
} as const;
export type AppPage = (typeof AppPage)[keyof typeof AppPage];

/**
 * Pick the boot page from the persisted user profile. DB is the single source
 * of truth for "onboarding done": a non-null `onboardingCompletedAt` → Home,
 * otherwise → Onboarding. No localStorage flag.
 */
export function bootPageFor(profile: UserProfile | null): AppPage {
  const completed = profile !== null && profile.onboardingCompletedAt !== null;
  return completed ? AppPage.Home : AppPage.Onboarding;
}

type AppState = {
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  /** Current top-level page; null until the boot decision settles. */
  currentPage: AppPage | null;
  navigate: (page: AppPage) => void;
};

export const useAppStore = create<AppState>((set) => ({
  selectedProject: null,
  setSelectedProject: (project) => set({ selectedProject: project }),
  currentPage: null,
  navigate: (page) => set({ currentPage: page }),
}));
