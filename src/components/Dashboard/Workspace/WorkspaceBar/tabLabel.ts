import type { Dashboard } from '@/store/useWorkspaceStore';

export function dashboardLabel(d: Dashboard): string {
  if (d.scope.kind === 'launcher') return '＋ New tab';
  // Project tabs render an Avatar (logo or initials) as their icon, so the label
  // is the bare project name — no folder emoji prefix.
  if (d.scope.kind === 'project') return d.scope.project.name;
  const active = d.tabs.find((t) => t.id === d.activeTabId) ?? d.tabs[0];
  const agentName = active?.agentName ?? '';
  if (agentName) return `🤖 ${agentName}`;
  return `💬 ${active?.title ?? 'Discussion'}`;
}
