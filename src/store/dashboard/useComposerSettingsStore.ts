import { create } from 'zustand';

import { PermissionMode } from '@/components/Dashboard/AgentChat/AgentChatInput/ComposerStatusBar/statusBar';

// Per-conversation composer settings that must survive the composer's unmount and
// be read by independent surfaces — so they live in zustand, keyed by the same
// stable conversation key the model picker uses (`useModelStore`). An absent key
// reads as its safe default (Ask / think off), never as `undefined`.
//
// Both are wired through to the spawn (AgentChat reads them by conversationKey and
// passes them on every `window.api.spawn`): `permissionMode` → the CLI's real
// `--permission-mode` flag (allowlisted server-side in spawn.args.ts; `default` is
// omitted so the CLI uses its own default), and `think` → `--effort high` (the CLI
// has no `--think`, but `--effort` is real and works under `--print`; ON → high,
// OFF → omitted). Both flags work with `claude --print`.
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
