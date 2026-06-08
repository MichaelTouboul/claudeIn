import { create } from 'zustand';

// The models selectable per conversation (label for the picker + the `--model`
// id passed to `claude`). Central list so the picker and any indicator share one
// source. No selection for a conversation => omit `--model` (claude's default).
// SECURITY: this renderer list is convenience only — the authoritative allowlist
// that actually guards the `--model` flag lives in electron/services/spawn.args.ts
// (ALLOWED_MODELS). Keep the ids here in sync with that set.
export type ModelOption = { label: string; id: string };

export const MODELS: ModelOption[] = [
  { label: 'Opus 4.8', id: 'claude-opus-4-8' },
  { label: 'Sonnet 4.6', id: 'claude-sonnet-4-6' },
  { label: 'Haiku 4.5', id: 'claude-haiku-4-5-20251001' },
];

// Per-conversation selected model, keyed by a conversation key (the chat's
// localSessionId, falling back to the owning tab id). Selector-based, like the
// other stores. An absent key reads as `undefined` => claude default.
type ModelState = {
  models: Record<string, string>;
  getModel: (conversationKey: string) => string | undefined;
  setModel: (conversationKey: string, modelId: string) => void;
};

export const useModelStore = create<ModelState>((set, get) => ({
  models: {},
  getModel: (conversationKey) => get().models[conversationKey],
  setModel: (conversationKey, modelId) =>
    set((s) => ({ models: { ...s.models, [conversationKey]: modelId } })),
}));
