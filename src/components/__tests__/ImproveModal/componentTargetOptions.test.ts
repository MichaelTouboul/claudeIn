import { describe, expect, it } from 'vitest';

import {
  chainOptions,
  defaultSelectValue,
  FREE_TEXT_VALUE,
  NONE_VALUE,
  resolveTarget,
} from '@/components/ImproveModal/ComponentTargetSelect/componentTargetOptions';
import type { ImproveContextTarget } from '@/lib/types';

const target: ImproveContextTarget = {
  component: 'Button',
  sourcePath: 'src/components/_ui/Button/Button.tsx:9',
  chain: [
    { component: 'Button', sourcePath: 'src/components/_ui/Button/Button.tsx:9' },
    { component: 'AgentChatInput', sourcePath: 'src/components/Dashboard/AgentChatInput.tsx:12' },
    { component: 'AgentChat', sourcePath: 'src/components/Dashboard/AgentChat.tsx:1' },
  ],
};

describe('chainOptions', () => {
  it('maps a chain into indexed options', () => {
    expect(chainOptions(target)).toEqual([
      { index: 0, component: 'Button', sourcePath: 'src/components/_ui/Button/Button.tsx:9' },
      { index: 1, component: 'AgentChatInput', sourcePath: 'src/components/Dashboard/AgentChatInput.tsx:12' },
      { index: 2, component: 'AgentChat', sourcePath: 'src/components/Dashboard/AgentChat.tsx:1' },
    ]);
  });

  it('synthesizes a single option from a legacy target without a chain', () => {
    const legacy: ImproveContextTarget = { component: 'Foo', sourcePath: 'src/Foo.tsx:1' };
    expect(chainOptions(legacy)).toEqual([{ index: 0, component: 'Foo', sourcePath: 'src/Foo.tsx:1' }]);
  });

  it('returns [] for a null target', () => {
    expect(chainOptions(null)).toEqual([]);
  });
});

describe('defaultSelectValue', () => {
  it('defaults to the first non-_ui chain entry', () => {
    expect(defaultSelectValue(target)).toBe('1');
  });

  it('defaults to none when there is no target', () => {
    expect(defaultSelectValue(null)).toBe(NONE_VALUE);
  });

  it('falls back to index 0 when every entry is a _ui primitive', () => {
    const allUi: ImproveContextTarget = {
      component: 'Flex',
      chain: [
        { component: 'Flex', sourcePath: 'src/components/_ui/Flex/Flex.tsx:1' },
        { component: 'Stack', sourcePath: 'src/components/_ui/Stack/Stack.tsx:1' },
      ],
    };
    expect(defaultSelectValue(allUi)).toBe('0');
  });
});

describe('resolveTarget', () => {
  it('resolves a chain index to its component + sourcePath', () => {
    expect(resolveTarget(target, '1', '')).toEqual({
      component: 'AgentChatInput',
      sourcePath: 'src/components/Dashboard/AgentChatInput.tsx:12',
    });
  });

  it('resolves free-text to a component name with no path', () => {
    expect(resolveTarget(target, FREE_TEXT_VALUE, '  MyComponent ')).toEqual({
      component: 'MyComponent',
    });
  });

  it('resolves empty free-text to nothing', () => {
    expect(resolveTarget(target, FREE_TEXT_VALUE, '   ')).toEqual({});
  });

  it('resolves none to an empty target', () => {
    expect(resolveTarget(target, NONE_VALUE, 'ignored')).toEqual({});
  });

  it('degrades an out-of-range index to an empty target', () => {
    expect(resolveTarget(target, '99', '')).toEqual({});
  });
});
