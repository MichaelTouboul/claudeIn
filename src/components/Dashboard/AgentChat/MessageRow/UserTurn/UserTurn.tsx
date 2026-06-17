import { renderContentWithImages } from '@/components/_ui/InlineImage';

import { type UserContentRender } from '../../userContent';
import { renderTextWithChips } from '../chipText';
import { CopyButton } from '../CopyButton';
import { MessageHeader } from '../MessageHeader/MessageHeader';
import { SlashCommandMessage } from '../SlashCommandMessage/SlashCommandMessage';
import { ToonMessageChip } from '../ToonMessageChip/ToonMessageChip';
import { TurnAvatar, TurnKind } from '../TurnAvatar/TurnAvatar';

export type UserTurnProps = {
  decision: Exclude<UserContentRender, { kind: 'hidden' }>;
  time: string;
  copyText: string;
};

/** A *You* turn: chevron avatar + "You · HH:MM:SS" header + a compact indigo
 *  bubble (accent-subtle fill, accent border). Slash-command and TOON-attachment
 *  turns keep their dedicated renderers inside the column. */
export function UserTurn({ decision, time, copyText }: UserTurnProps) {
  return (
    <div className="group relative flex gap-3">
      <TurnAvatar kind={TurnKind.User} />
      <div className="flex min-w-0 flex-1 flex-col items-start">
        <MessageHeader name="You" time={time} />
        {decision.kind === 'slash' ? (
          <SlashCommandMessage parsed={decision.message} />
        ) : decision.kind === 'toon' ? (
          <div className="flex flex-col gap-1">
            {decision.text ? (
              <div
                className="rounded-[var(--radius-lg)] border px-3.5 py-2.5 text-[14.5px] leading-snug"
                style={{
                  background: 'var(--color-accent-subtle)',
                  borderColor: 'var(--color-accent-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {renderTextWithChips(decision.text)}
              </div>
            ) : null}
            <ToonMessageChip info={decision.info} />
          </div>
        ) : (
          <div
            className="rounded-[var(--radius-lg)] border px-3.5 py-2.5 text-[14.5px] leading-snug"
            style={{
              background: 'var(--color-accent-subtle)',
              borderColor: 'var(--color-accent-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            {hasImagePath(decision.text)
              ? renderContentWithImages(decision.text)
              : renderTextWithChips(decision.text)}
          </div>
        )}
        <CopyButton text={copyText} className="mt-1" />
      </div>
    </div>
  );
}

/** Inline image paths (absolute `/…/name.ext`) get the dedicated image renderer;
 *  plain prose gets the chip renderer. Mutually exclusive routing keeps both the
 *  image affordance and the technical-token chips working. */
function hasImagePath(text: string): boolean {
  return /(?:\/[\w.\-~]+)+\.(?:png|jpe?g|webp|gif|svg)/i.test(text);
}
