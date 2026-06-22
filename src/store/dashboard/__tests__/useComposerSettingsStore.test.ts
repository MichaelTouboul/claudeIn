import { beforeEach, describe, expect, it } from 'vitest';

import { PermissionMode } from '@/components/Dashboard/AgentChat/AgentChatInput/ComposerStatusBar/statusBar';
import { useComposerSettingsStore } from '@/store/dashboard/useComposerSettingsStore';

describe('useComposerSettingsStore', () => {
  beforeEach(() => {
    useComposerSettingsStore.setState({ permissionModes: {}, think: {} });
  });

  it('defaults an unknown conversation to Ask permission mode', () => {
    expect(useComposerSettingsStore.getState().getPermissionMode('conv-x')).toBe(PermissionMode.Ask);
  });

  it('persists a chosen permission mode per conversation', () => {
    useComposerSettingsStore.getState().setPermissionMode('conv-a', PermissionMode.Plan);
    expect(useComposerSettingsStore.getState().getPermissionMode('conv-a')).toBe(PermissionMode.Plan);
    // a second conversation is unaffected
    expect(useComposerSettingsStore.getState().getPermissionMode('conv-b')).toBe(PermissionMode.Ask);
  });

  it('defaults think to off and toggles it per conversation', () => {
    const s = useComposerSettingsStore.getState();
    expect(s.getThink('conv-a')).toBe(false);
    s.toggleThink('conv-a');
    expect(useComposerSettingsStore.getState().getThink('conv-a')).toBe(true);
    useComposerSettingsStore.getState().toggleThink('conv-a');
    expect(useComposerSettingsStore.getState().getThink('conv-a')).toBe(false);
  });
});
