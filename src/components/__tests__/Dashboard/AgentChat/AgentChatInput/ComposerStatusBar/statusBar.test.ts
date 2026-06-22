import { describe, expect, it } from 'vitest';

import {
  ContextLevel,
  contextLevel,
  contextLevelColorVar,
  formatCost,
  PermissionMode,
  permissionModeLabel,
} from '@/components/Dashboard/AgentChat/AgentChatInput/ComposerStatusBar/statusBar';

describe('contextLevel', () => {
  it('is green below 60%', () => {
    expect(contextLevel(0)).toBe(ContextLevel.Ok);
    expect(contextLevel(31)).toBe(ContextLevel.Ok);
    expect(contextLevel(59.9)).toBe(ContextLevel.Ok);
  });

  it('is amber from 60% up to but not including 85%', () => {
    expect(contextLevel(60)).toBe(ContextLevel.Warn);
    expect(contextLevel(84.9)).toBe(ContextLevel.Warn);
  });

  it('is red at 85% and above', () => {
    expect(contextLevel(85)).toBe(ContextLevel.Danger);
    expect(contextLevel(100)).toBe(ContextLevel.Danger);
  });
});

describe('contextLevelColorVar', () => {
  it('maps each level to its design token', () => {
    expect(contextLevelColorVar(ContextLevel.Ok)).toBe('var(--color-active)');
    expect(contextLevelColorVar(ContextLevel.Warn)).toBe('var(--color-warning)');
    expect(contextLevelColorVar(ContextLevel.Danger)).toBe('var(--color-danger)');
  });
});

describe('formatCost', () => {
  it('formats USD with two decimals and a leading $', () => {
    expect(formatCost(0)).toBe('$0.00');
    expect(formatCost(0.48)).toBe('$0.48');
    expect(formatCost(1.5)).toBe('$1.50');
    expect(formatCost(12.345)).toBe('$12.35');
  });

  it('never renders a negative or NaN cost', () => {
    expect(formatCost(-1)).toBe('$0.00');
    expect(formatCost(Number.NaN)).toBe('$0.00');
  });
});

describe('permissionModeLabel', () => {
  it('gives a human label for each mode', () => {
    expect(permissionModeLabel(PermissionMode.Ask)).toBe('Ask');
    expect(permissionModeLabel(PermissionMode.AcceptEdits)).toBe('Auto-accept');
    expect(permissionModeLabel(PermissionMode.Plan)).toBe('Plan');
  });
});
