import { ChevronRight, Loader2, Maximize2, Minimize2, Send } from 'lucide-react';
import { type RefObject, useMemo, useState } from 'react';

import { Button } from '@/components/_ui/Button';
import { IconButton } from '@/components/_ui/IconButton';
import { Kbd } from '@/components/_ui/Kbd';
import type { FilePickerKind, SpawnSession  } from '@/lib/types';
import { buildJsonAttachment, cn } from '@/lib/utils';
import { PanelTabKind, promptEditorTabId, usePanelStore } from '@/store/dashboard/usePanelStore';
import { byComposer, useToonStore } from '@/store/useToonStore';

import type { HistoryNavContext } from '../RichEditor/plugins/SubmitPlugin';
import { RichEditor, type RichEditorHandle } from '../RichEditor/RichEditor';
import { AgentTabs } from './AgentTabs/AgentTabs';
import { AttachmentStrip } from './AttachmentStrip/AttachmentStrip';
import { AttachMenu } from './AttachMenu/AttachMenu';
import { ComposerStatusBarContainer } from './ComposerStatusBar/ComposerStatusBarContainer';
import { InputMenu } from './InputMenu';
import { JsonChip } from './JsonChip/JsonChip';
import { useInputMenus } from './useInputMenus';

export type AttachedFile = { path: string; dataUrl: string | null };

export type AgentChatInputProps = {
  input: string;
  attachedFiles: AttachedFile[];
  waitingInput: boolean;
  isRunning: boolean;
  spawning: boolean;
  session: SpawnSession | null;
  // The conversation's claude session id + its own (orchestrator) agent name —
  // used to scope the sub-agent presence tabs to this conversation.
  claudeSessionId: string | null;
  agentName: string;
  // Identifies this chat's composer — scopes the pasted-JSON attachments in
  // `useToonStore` (one composer per chat tab). Same value AgentChat sends from.
  composerId: string;
  // The spawn directory (the repo) — drives the status strip's branch/worktrees.
  projectPath?: string;
  editorRef: RefObject<RichEditorHandle | null>;
  onInputChange: (val: string) => void;
  /** Execute a chosen slash command (e.g. `/compact`). */
  onSelectSlash: (cmd: string) => void;
  /** The `/model` picker submenu open state (driven by AgentChat). */
  modelPickerOpen: boolean;
  /** The label of the model selected for this conversation, if any. */
  selectedModelLabel?: string;
  /** Commit a chosen model id for this conversation (closes the picker). */
  onSelectModel: (modelId: string) => void;
  /** Dismiss the model picker without choosing. */
  onCloseModelPicker: () => void;
  onRemoveAttachment: (index: number) => void;
  /** Open the native file picker for the chosen kind and attach the result. */
  onAttach: (kind: FilePickerKind) => void;
  onSend: () => void;
  /** Session prompt-history navigation for ↑/↓ at the content edges (menu closed). */
  onHistoryNav: (key: 'ArrowUp' | 'ArrowDown', ctx: HistoryNavContext) => string | null;
};

export function AgentChatInput({
  input,
  attachedFiles,
  waitingInput,
  isRunning,
  spawning,
  session,
  claudeSessionId,
  agentName,
  composerId,
  projectPath,
  editorRef,
  onInputChange,
  onSelectSlash,
  modelPickerOpen,
  selectedModelLabel,
  onSelectModel,
  onCloseModelPicker,
  onRemoveAttachment,
  onAttach,
  onSend,
  onHistoryNav,
}: AgentChatInputProps) {
  const [plainText, setPlainText] = useState('');
  // Drives the composer focus ring (accent border + accent-subtle glow).
  const [focused, setFocused] = useState(false);
  const menus = useInputMenus(plainText, modelPickerOpen);

  // The prompt-editor panel: the maximize button OPENS a real workspace editor
  // (right sidebar) seeded with this composer's current markdown, rather than the
  // old invisible inline max-height toggle. The button reflects/toggles whether
  // the panel is currently showing THIS composer's editor.
  const panelOpen = usePanelStore((s) => s.isOpen);
  const panelCurrent = usePanelStore((s) => s.current);
  const openPanel = usePanelStore((s) => s.open);
  const closePanel = usePanelStore((s) => s.close);
  const editorPanelOpen =
    panelOpen &&
    panelCurrent?.kind === PanelTabKind.PromptEditor &&
    panelCurrent.payload.composerId === composerId;
  const togglePromptEditor = () => {
    if (editorPanelOpen) {
      closePanel();
      return;
    }
    openPanel({
      id: promptEditorTabId(composerId),
      kind: PanelTabKind.PromptEditor,
      title: 'Éditeur de prompt',
      payload: { composerId, text: input },
    });
  };

  // Select the stable `attachments` record (zustand selectors must return a stable
  // reference — `byComposer` builds a NEW array each call, which would loop), then
  // derive THIS composer's slice with useMemo so the chip strip recomputes only
  // when the record actually changes.
  const attachments = useToonStore((s) => s.attachments);
  const jsonAttachments = useMemo(() => byComposer(attachments, composerId), [attachments, composerId]);
  const addAttachment = useToonStore((s) => s.add);

  // On paste: if the text is substantial JSON, build an attachment (auto-encode
  // TOON, ≈token delta, default to the smaller format) and CLAIM the paste so the
  // raw blob never lands in the editor. Anything else falls through as normal text.
  const handlePasteText = (text: string): boolean => {
    const attachment = buildJsonAttachment(text, composerId);
    if (!attachment) return false;
    addAttachment(attachment);
    return true;
  };

  // Auto-focus when a turn finishes lives in AgentChat (on `spawn_exit`), since
  // the old `waitingInput`-based effect here never fired: `claude --print` is
  // one-shot, so the backend never emits `spawn_input_request`. `waitingInput`
  // is still consumed below for styling and the placeholder.

  const handleSelect = (id: string) => {
    if (menus.kind === 'model') {
      // The model picker's item id IS the model id; committing closes the picker.
      onSelectModel(id);
    } else if (menus.kind === 'slash') {
      onSelectSlash(id);
      editorRef.current?.clear();
    } else if (menus.kind === 'mention') {
      editorRef.current?.insertMention(id);
    }
    editorRef.current?.focus();
  };

  // Enter inside an open menu = select the highlight (consumes the key). For a slash
  // command this launches it; for a mention it inserts the mention.
  const handleEnter = (): boolean => {
    if (menus.kind && menus.activeId) {
      handleSelect(menus.activeId);
      return true;
    }
    return false;
  };

  // Tab inside an open slash/mention menu = COMPLETE the highlighted suggestion into
  // the input as text (and keep focus) WITHOUT launching/submitting it. The user can
  // then type args or press Enter to send. The model picker isn't a typed token, so
  // Tab is left to its default behavior there.
  const handleComplete = (): boolean => {
    if (!menus.activeId) return false;
    if (menus.kind === 'slash') {
      editorRef.current?.insertSlashCommand(menus.activeId);
    } else if (menus.kind === 'mention') {
      editorRef.current?.insertMention(menus.activeId);
    } else {
      return false;
    }
    editorRef.current?.focus();
    return true;
  };

  // ↑/↓ to move, Esc to dismiss; only while a menu is open. Other keys pass through.
  const handleNavKey = (key: string): boolean => {
    if (!menus.kind) return false;
    if (key === 'ArrowDown') {
      menus.move(1);
      return true;
    }
    if (key === 'ArrowUp') {
      menus.move(-1);
      return true;
    }
    if (key === 'Escape') {
      // The model picker is opened explicitly, so it must be closed explicitly.
      if (menus.kind === 'model') onCloseModelPicker();
      // Dismiss by clearing the open token: clearing the editor is too aggressive,
      // so we simply blur the menu via a focus bounce (re-render hides it on next type).
      editorRef.current?.focus();
      return true;
    }
    return false;
  };

  return (
    <div className="p-3">
      {/* Slash / mention command menu (mutually exclusive). Outside the composer
          card so its popover isn't clipped by the card's overflow. */}
      {menus.kind ? (
        <InputMenu
          groups={menus.groups}
          activeIndex={menus.activeIndex}
          mono={menus.kind === 'slash'}
          ariaLabel={menus.kind === 'slash' ? 'Slash commands' : 'Mentions'}
          onSelect={handleSelect}
        />
      ) : null}

      <div
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={() => setFocused(false)}
        className={cn(
          'relative overflow-hidden rounded-xl border bg-surface-1 transition-colors',
          waitingInput
            ? 'border-[var(--color-warning)]/50'
            : focused
              ? 'border-accent'
              : 'border-border-strong',
        )}
        style={focused && !waitingInput ? { boxShadow: '0 0 0 3px var(--color-accent-subtle)' } : undefined}
      >
        {/* Pasted-JSON (TOON) attachments */}
        {jsonAttachments.length > 0 ? (
          <div className="flex flex-wrap gap-2 px-3 pt-2 pb-1">
            {jsonAttachments.map((att) => (
              <JsonChip key={att.id} attachment={att} />
            ))}
          </div>
        ) : null}

        <AttachmentStrip files={attachedFiles} onRemove={onRemoveAttachment} />

        {/* Sub-agent presence for THIS conversation, above the editor. */}
        <AgentTabs claudeSessionId={claudeSessionId} orchestratorName={agentName} />

        <div className="flex gap-2 items-end px-3 pt-2 pb-1">
          <div className={`flex items-center text-sm shrink-0 pt-1.5 ${waitingInput ? "text-[var(--color-warning)]" : "text-accent"}`}>
            <ChevronRight size={14} />
          </div>
          <RichEditor
            handleRef={editorRef}
            placeholder={
              waitingInput
                ? "Type your response (yes / no / ...)..."
                : session && isRunning
                  ? "Send a message..."
                  : selectedModelLabel
                    ? `${selectedModelLabel} · type, / for commands or @ to mention...`
                    : "Type a prompt, / for commands or @ to mention..."
            }
            onChange={(markdown, plain) => {
              onInputChange(markdown);
              setPlainText(plain);
            }}
            onSubmit={onSend}
            onEnter={handleEnter}
            onComplete={handleComplete}
            onNavKey={handleNavKey}
            onHistoryNav={onHistoryNav}
            onPasteText={handlePasteText}
          />
          <div className="flex items-center gap-1 pb-0.5">
            <Kbd className="mr-1 hidden sm:inline-flex" title="Envoyer">⌘⏎</Kbd>
            <IconButton
              size="sm"
              onClick={togglePromptEditor}
              active={editorPanelOpen}
              aria-label={editorPanelOpen ? 'Collapse prompt editor' : 'Open prompt editor'}
              title={editorPanelOpen ? 'Collapse prompt editor' : 'Open prompt editor'}
            >
              {editorPanelOpen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </IconButton>
            <AttachMenu onAttach={onAttach} />
            <Button
              intent="ghost"
              size="icon"
              onClick={onSend}
              disabled={(!input.trim() && attachedFiles.length === 0 && jsonAttachments.length === 0) || spawning}
              title="Send"
            >
              {spawning ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </Button>
          </div>
        </div>

        {/* Status strip along the composer's bottom edge. */}
        <ComposerStatusBarContainer
          conversationKey={composerId}
          agentName={agentName}
          claudeSessionId={claudeSessionId}
          projectPath={projectPath}
        />
      </div>
    </div>
  );
}
