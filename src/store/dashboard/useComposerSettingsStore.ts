import { create } from 'zustand';

import { PermissionMode } from '@/components/Dashboard/AgentChat/AgentChatInput/ComposerStatusBar/statusBar';

// Per-conversation composer settings that have no backend wiring yet but must
// survive the composer's unmount and be read by independent surfaces — so they
// live in zustand, keyed by the same stable conversation key the model picker
// uses (`useModelStore`). An absent key reads as its safe default (Ask / think
// off), never as `undefined`.
//
// NOTE: `claude --print` exposes no permission-mode flag in this app's spawn
// args, and extended-thinking is not a `--print` flag either; these selections
// are persisted UI intent today. Wiring them to the subprocess is a follow-up
// (see ComposerStatusBar comments) — kept out of scope for this feature.
type ComposerSettingsState = {
  permissionModes: Record<string, PermissionMode>;
  think: Record<string, boolean>;
  getPermissionMode: (conversationKey: string) => PermissionMode;
  setPermissionMode: (conversationKey: string, mode: PermissionMode) => void;
  getThink: (conversationKey: string) => boolean;
  toggleThink: (conversationKey: string) => void;
};

export const useComposerSettingsStore = create<ComposerSettingsState>((set, get) => ({
  permissionModes: {},
  think: {},
  getPermissionMode: (conversationKey) => get().permissionModes[conversationKey] ?? PermissionMode.Ask,
  setPermissionMode: (conversationKey, mode) =>
    set((s) => ({ permissionModes: { ...s.permissionModes, [conversationKey]: mode } })),
  getThink: (conversationKey) => get().think[conversationKey] ?? false,
  toggleThink: (conversationKey) =>
    set((s) => ({ think: { ...s.think, [conversationKey]: !(s.think[conversationKey] ?? false) } })),
}));
