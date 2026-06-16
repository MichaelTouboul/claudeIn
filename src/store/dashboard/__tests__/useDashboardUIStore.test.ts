import { beforeEach, describe, expect, it } from 'vitest';

import type { AgentSummary } from '@/lib/types';

import {
  LibraryCategory,
  SidebarView,
  useDashboardUIStore,
} from '../useDashboardUIStore';

const initial = useDashboardUIStore.getState();
beforeEach(() => useDashboardUIStore.setState(initial, true));

const fakeAgent = { id: 'a1' } as AgentSummary;

describe('useDashboardUIStore dashboard navigation', () => {
  it('defaults to no selected agent', () => {
    const s = useDashboardUIStore.getState();
    expect(s.selectedAgent).toBeNull();
  });

  it('selectAgent records the agent and clears any selected skill', () => {
    useDashboardUIStore.getState().selectAgent(fakeAgent);
    const s = useDashboardUIStore.getState();
    expect(s.selectedAgent).toBe(fakeAgent);
    expect(s.selectedSkill).toBeNull();
  });

  it('backToProject clears the selected agent', () => {
    useDashboardUIStore.getState().selectAgent(fakeAgent);
    expect(useDashboardUIStore.getState().selectedAgent).toBe(fakeAgent);
    useDashboardUIStore.getState().backToProject();
    expect(useDashboardUIStore.getState().selectedAgent).toBeNull();
  });

  it('openPanel reveals a panel (idempotently, never closing an open one)', () => {
    const { openPanel } = useDashboardUIStore.getState();
    openPanel('agents');
    expect(useDashboardUIStore.getState().openPanels.has('agents')).toBe(true);
    // Calling again keeps it open (vs togglePanel, which would close it).
    openPanel('agents');
    expect(useDashboardUIStore.getState().openPanels.has('agents')).toBe(true);
  });
});

describe('useDashboardUIStore sidebar switch', () => {
  it('defaults to the Sessions view with no drilled-in category', () => {
    const s = useDashboardUIStore.getState();
    expect(s.sidebarView).toBe(SidebarView.Sessions);
    expect(s.libraryCategory).toBeNull();
  });

  it('setSidebarView toggles between Sessions and Library and persists', () => {
    useDashboardUIStore.getState().setSidebarView(SidebarView.Library);
    expect(useDashboardUIStore.getState().sidebarView).toBe(SidebarView.Library);
    useDashboardUIStore.getState().setSidebarView(SidebarView.Sessions);
    expect(useDashboardUIStore.getState().sidebarView).toBe(SidebarView.Sessions);
  });

  it('switching back to Sessions clears any drilled-in library category', () => {
    useDashboardUIStore.getState().setSidebarView(SidebarView.Library);
    useDashboardUIStore.getState().setLibraryCategory(LibraryCategory.Agents);
    expect(useDashboardUIStore.getState().libraryCategory).toBe(LibraryCategory.Agents);
    useDashboardUIStore.getState().setSidebarView(SidebarView.Sessions);
    expect(useDashboardUIStore.getState().libraryCategory).toBeNull();
  });

  it('setLibraryCategory drills in and back (null) returns to the list', () => {
    useDashboardUIStore.getState().setLibraryCategory(LibraryCategory.Hooks);
    expect(useDashboardUIStore.getState().libraryCategory).toBe(LibraryCategory.Hooks);
    useDashboardUIStore.getState().setLibraryCategory(null);
    expect(useDashboardUIStore.getState().libraryCategory).toBeNull();
  });
});
