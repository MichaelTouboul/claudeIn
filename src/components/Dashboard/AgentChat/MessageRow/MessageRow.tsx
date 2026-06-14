import { Bot, ChevronRight, Shield, Wrench } from 'lucide-react';

import { Inline } from '@/components/_ui/Inline';
import { renderContentWithImages } from '@/components/_ui/InlineImage';
import { DiffBlock } from '@/components/Dashboard/ResponseBody/blocks/DiffBlock/DiffBlock';
import { parseEditTool } from '@/components/Dashboard/ResponseBody/blocks/DiffBlock/parseEditTool';
import { ResponseBody } from '@/components/Dashboard/ResponseBody/ResponseBody';
import type { ChatMessage } from '@/lib/types';

import { parseAskPrompt } from '../askPrompt';
import { AskPrompt } from '../AskPrompt/AskPrompt';
import { decideUserContent } from '../userContent';
import { CopyButton } from './CopyButton';
import { OpenInPanelButton } from './OpenInPanelButton';
import { SlashCommandMessage } from './SlashCommandMessage/SlashCommandMessage';
import { ToonMessageChip } from './ToonMessageChip/ToonMessageChip';

export type MessageRowProps = {
  msg: ChatMessage;
  isLast: boolean;
  onAnswer: (value: string) => void;
};

export function MessageRow({ msg, isLast, onAnswer }: MessageRowProps) {
  const isUser = msg.role === "user";
  const isTool = msg.role === "tool";
  const time = new Date(msg.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const hasContent = msg.content.trim().length > 0;

  if (isUser) {
    const decision = decideUserContent(msg.content);
    // Pure plumbing / harness noise: the whole row disappears (no empty "you" header).
    if (decision.kind === 'hidden') return null;
    const copyText = decision.kind === 'text' || decision.kind === 'toon' ? decision.text : msg.content;
    return (
      <div className="group relative">
        <Inline gap={2} className="mb-0.5">
          <ChevronRight size={12} className="text-accent" />
          <span className="text-xs text-accent font-medium">you</span>
          <span className="text-xs text-fg-subtle opacity-0 group-hover:opacity-100">{time}</span>
        </Inline>
        {decision.kind === 'slash' ? (
          <SlashCommandMessage parsed={decision.message} />
        ) : decision.kind === 'toon' ? (
          <div className="ml-5 flex flex-col gap-1">
            {decision.text ? (
              <pre className="text-sm text-accent whitespace-pre-wrap font-mono leading-relaxed">{renderContentWithImages(decision.text)}</pre>
            ) : null}
            <ToonMessageChip info={decision.info} />
          </div>
        ) : (
          <pre className="text-sm text-accent whitespace-pre-wrap font-mono ml-5 leading-relaxed">{renderContentWithImages(decision.text)}</pre>
        )}
        <CopyButton text={copyText} className="ml-5 mt-1" />
      </div>
    );
  }

  if (isTool) {
    const fileDiff = msg.toolName ? parseEditTool(msg.toolName, msg.content) : null;
    // When a diff renders, DiffBlock's own Copy action (copies the diff text)
    // supersedes the outer raw-JSON copy button — suppress the latter.
    const showCopy = hasContent && fileDiff === null;
    return (
      <div className="group relative ml-5">
        <Inline gap={2} className="mb-0.5">
          <Wrench size={10} className="text-[var(--color-warning)]" />
          <span className="text-xs text-[var(--color-warning)] font-mono">{msg.toolName || "tool"}</span>
          <span className="text-xs text-fg-subtle opacity-0 group-hover:opacity-100">{time}</span>
        </Inline>
        {fileDiff && msg.toolName ? (
          <DiffBlock diff={fileDiff} toolName={msg.toolName} />
        ) : (
          <pre className="text-xs text-fg-muted whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">{renderContentWithImages(msg.content)}</pre>
        )}
        {showCopy ? <CopyButton text={msg.content} className="mt-1" /> : null}
      </div>
    );
  }

  const prompt = parseAskPrompt(msg.content);
  const isAuthorization =
    prompt?.type === 'choice' &&
    prompt.options.some((o) => o.variant === 'accept' || o.variant === 'deny');

  return (
    <div className="group relative">
      <Inline gap={2} className="mb-0.5">
        {isAuthorization ? (
          <Shield size={12} className="text-[var(--color-warning)]" />
        ) : (
          <Bot size={12} className="text-fg-muted" />
        )}
        <span className={`text-xs font-medium ${isAuthorization ? "text-[var(--color-warning)]" : "text-fg-muted"}`}>
          {isAuthorization ? "authorization" : "agent"}
        </span>
        <span className="text-xs text-fg-subtle opacity-0 group-hover:opacity-100">{time}</span>
      </Inline>
      <div className="ml-5">
        <ResponseBody content={msg.content} />
      </div>
      {hasContent ? <CopyButton text={msg.content} className="ml-5 mt-1" /> : null}
      {hasContent && !isAuthorization ? <OpenInPanelButton text={msg.content} /> : null}
      {prompt ? <AskPrompt prompt={prompt} isActive={isLast} onAnswer={onAnswer} /> : null}
    </div>
  );
}
