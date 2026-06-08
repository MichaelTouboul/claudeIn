import { ChevronRight, Loader2, Paperclip, Send, X } from 'lucide-react';
import { type RefObject, useState } from 'react';

import { Button } from '@/components/_ui/Button';
import type { SpawnSession } from '@/types/spawn.types';

import { RichEditor, type RichEditorHandle } from '../RichEditor/RichEditor';
import { AgentTabs } from './AgentTabs/AgentTabs';
import { InputMenu } from './InputMenu';
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
  onAttach: () => void;
  onSend: () => void;
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
}: AgentChatInputProps) {
  const [plainText, setPlainText] = useState('');
  const menus = useInputMenus(plainText, modelPickerOpen);

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

  // Enter inside an open menu = select the highlight (consumes the key).
  const handleEnter = (): boolean => {
    if (menus.kind && menus.activeId) {
      handleSelect(menus.activeId);
      return true;
    }
    return false;
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
    <div className={`relative border-t p-3 ${waitingInput ? "border-yellow-500/50 bg-yellow-500/5" : "border-border"}`}>
      {/* Attached files preview */}
      {attachedFiles.length > 0 ? (
        <div className="flex flex-wrap gap-2 px-3 pt-2 pb-1">
          {attachedFiles.map((file, i) => (
            <div key={file.path} className="relative group/attach">
              {file.dataUrl ? (
                <img
                  src={file.dataUrl}
                  alt={file.path.split("/").pop() || ""}
                  className="rounded-lg"
                  style={{
                    maxWidth: "80px",
                    maxHeight: "80px",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
              ) : (
                <div
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "#9ca3af",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <Paperclip size={10} />
                  <span className="truncate max-w-[120px]">{file.path.split("/").pop()}</span>
                </div>
              )}
              <button
                onClick={() => onRemoveAttachment(i)}
                title="Remove attachment"
                aria-label="Remove attachment"
                className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full opacity-0 group-hover/attach:opacity-100 transition-opacity"
                style={{ background: "#374151", color: "#d1d5db" }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Slash / mention command menu (mutually exclusive). */}
      {menus.kind ? (
        <InputMenu
          groups={menus.groups}
          activeIndex={menus.activeIndex}
          mono={menus.kind === 'slash'}
          onSelect={handleSelect}
        />
      ) : null}

      {/* Sub-agent presence for THIS conversation, above the editor. */}
      <AgentTabs claudeSessionId={claudeSessionId} orchestratorName={agentName} />

      <div className="flex gap-2 items-end">
        <div className={`flex items-center text-sm shrink-0 pt-1.5 ${waitingInput ? "text-yellow-400" : "text-accent"}`}>
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
          onNavKey={handleNavKey}
        />
        <Button intent="ghost" size="icon" onClick={onAttach} title="Attach file">
          <Paperclip size={16} />
        </Button>
        <Button
          intent="ghost"
          size="icon"
          onClick={onSend}
          disabled={(!input.trim() && attachedFiles.length === 0) || spawning}
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
  );
}
