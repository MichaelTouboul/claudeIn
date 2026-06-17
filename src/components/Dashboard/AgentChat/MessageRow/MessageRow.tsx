import { ResponseBody } from '@/components/Dashboard/ResponseBody/ResponseBody';
import type { ChatMessage } from '@/lib/types';

import { parseAskPrompt } from '../askPrompt';
import { AskPrompt } from '../AskPrompt/AskPrompt';
import { decideUserContent } from '../userContent';
import { CopyButton } from './CopyButton';
import { MessageHeader } from './MessageHeader/MessageHeader';
import { OpenInPanelButton } from './OpenInPanelButton';
import { ToolTurn } from './ToolTurn/ToolTurn';
import { TurnAvatar, TurnKind } from './TurnAvatar/TurnAvatar';
import { UserTurn } from './UserTurn/UserTurn';

export type MessageRowProps = {
  msg: ChatMessage;
  isLast: boolean;
  onAnswer: (value: string) => void;
};

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function MessageRow({ msg, isLast, onAnswer }: MessageRowProps) {
  const time = formatTime(msg.timestamp);

  if (msg.role === 'user') {
    const decision = decideUserContent(msg.content);
    // Pure plumbing / harness noise: the whole row disappears (no empty "you" header).
    if (decision.kind === 'hidden') return null;
    const copyText =
      decision.kind === 'text' || decision.kind === 'toon' ? decision.text : msg.content;
    return <UserTurn decision={decision} time={time} copyText={copyText} />;
  }

  if (msg.role === 'tool') {
    return <ToolTurn toolName={msg.toolName} content={msg.content} time={time} />;
  }

  return <AssistantTurn msg={msg} time={time} isLast={isLast} onAnswer={onAnswer} />;
}

type AssistantTurnProps = {
  msg: ChatMessage;
  time: string;
  isLast: boolean;
  onAnswer: (value: string) => void;
};

/** A *Claude* turn (or an authorization request). A plain reply shows the bot
 *  avatar + "Claude · time" + the rendered prose; an accept/deny `cam-ask`
 *  prompt shows the shield avatar + "Authorization requise" + the auth card. */
function AssistantTurn({ msg, time, isLast, onAnswer }: AssistantTurnProps) {
  const hasContent = msg.content.trim().length > 0;
  const prompt = parseAskPrompt(msg.content);
  const isAuthorization =
    prompt?.type === 'choice' &&
    prompt.options.some((o) => o.variant === 'accept' || o.variant === 'deny');

  return (
    <div className="group relative flex gap-3">
      <TurnAvatar kind={isAuthorization ? TurnKind.Authorization : TurnKind.Claude} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MessageHeader
          name={isAuthorization ? 'Authorization requise' : 'Claude'}
          time={isAuthorization ? '' : time}
          nameColor={isAuthorization ? 'var(--color-warning)' : undefined}
        />
        {isAuthorization ? null : <ResponseBody content={msg.content} />}
        {hasContent && !isAuthorization ? (
          <div className="mt-1 flex items-center gap-1">
            <CopyButton text={msg.content} />
            <OpenInPanelButton text={msg.content} />
          </div>
        ) : null}
        {prompt ? <AskPrompt prompt={prompt} isActive={isLast} onAnswer={onAnswer} /> : null}
      </div>
    </div>
  );
}
