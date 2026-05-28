import { ChevronRight, Loader2, Paperclip, Send, X } from 'lucide-react';
import { type RefObject } from 'react';

import { Button } from '@/components/_ui/Button';
import type { SpawnSession } from '@/types/spawn.types';

import type { SlashCommand } from '../slashCommands';

export type AttachedFile = { path: string; dataUrl: string | null };

export type AgentChatInputProps = {
  input: string;
  attachedFiles: AttachedFile[];
  waitingInput: boolean;
  isRunning: boolean;
  spawning: boolean;
  session: SpawnSession | null;
  showSlash: boolean;
  slashIndex: number;
  filteredCommands: SlashCommand[];
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onInputChange: (val: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSelectSlash: (cmd: string) => void;
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
  showSlash,
  slashIndex,
  filteredCommands,
  inputRef,
  onInputChange,
  onKeyDown,
  onSelectSlash,
  onRemoveAttachment,
  onAttach,
  onSend,
}: AgentChatInputProps) {
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
                className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full opacity-0 group-hover/attach:opacity-100 transition-opacity"
                style={{ background: "#374151", color: "#d1d5db" }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Slash command popup */}
      {showSlash && filteredCommands.length > 0 ? (
        <div className="absolute bottom-full left-3 right-3 mb-1 bg-surface-2 border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto py-1">
          {filteredCommands.map((cmd, i) => (
            <button
              key={cmd.cmd}
              onClick={() => onSelectSlash(cmd.cmd)}
              className={`w-full flex items-center gap-3 px-3 py-1.5 text-xs transition-colors ${
                i === slashIndex ? "bg-accent/20 text-accent" : "text-fg hover:bg-surface-3"
              }`}
            >
              <span className="font-mono text-yellow-400 w-28 text-left">{cmd.cmd}</span>
              <span className="text-fg-muted">{cmd.desc}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2 items-end">
        <div className={`flex items-center text-sm shrink-0 pt-1.5 ${waitingInput ? "text-yellow-400" : "text-accent"}`}>
          <ChevronRight size={14} />
        </div>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={waitingInput ? "Type your response (yes / no / ...)..." : session && isRunning ? "Send a message..." : "Type a prompt or / for commands..."}
          rows={1}
          className="flex-1 bg-transparent text-fg text-sm resize-none focus:outline-none font-mono placeholder-gray-700 leading-relaxed"
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 120) + "px";
          }}
        />
        <Button intent="ghost" size="icon" onClick={onAttach} title="Attach file">
          <Paperclip size={16} />
        </Button>
        <Button
          intent="ghost"
          size="icon"
          onClick={onSend}
          disabled={(!input.trim() && attachedFiles.length === 0) || spawning}
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
