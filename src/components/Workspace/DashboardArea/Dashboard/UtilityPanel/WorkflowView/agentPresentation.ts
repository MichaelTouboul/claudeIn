import { AgentPresenceStatus } from '@/store/useEventsStore';

/**
 * How one presence status looks in the workflow views: its human label, whether
 * its status dot pulses (only a genuinely-running agent pulses), and the
 * design-system CSS var that colors it.
 */
export type AgentPresentation = {
  label: string;
  /** Whether the status dot animates (pulses) — true ONLY for the active state. */
  dot: boolean;
  /** A design-system CSS custom property, e.g. `var(--color-active)`. */
  colorVar: string;
};

/**
 * Value → presentation behavior, defined ONCE (CLAUDE.md: enum + behavior map,
 * not a fallback chain). Every {@link AgentPresenceStatus} has an entry here, so
 * the views look it up directly — no `isActive ? … : …` chain that could mix
 * sources. A consumer with an absent status uses `?? AgentPresenceStatus.Idle`
 * for the genuine unknown case only, never as a primary derivation.
 */
export const AGENT_PRESENTATION: Record<AgentPresenceStatus, AgentPresentation> = {
  [AgentPresenceStatus.Active]: { label: 'Working', dot: true, colorVar: 'var(--color-active)' },
  [AgentPresenceStatus.Waiting]: { label: 'Waiting', dot: false, colorVar: 'var(--color-accent)' },
  [AgentPresenceStatus.Idle]: { label: 'Idle', dot: false, colorVar: 'var(--color-text-muted)' },
};
