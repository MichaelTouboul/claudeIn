import * as Progress from '@radix-ui/react-progress';

import { formatTokens, progressColor } from '@/components/Workspace/utils';

export type ContextBarProps = {
  percent: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
};

export function ContextBar({ percent, tokensIn, tokensOut, costUsd }: ContextBarProps) {
  return (
    <Progress.Root
      value={percent}
      max={100}
      className="absolute inset-0 rounded-lg pointer-events-none transition-all duration-500"
      title={`In: ${formatTokens(tokensIn)} · Out: ${formatTokens(tokensOut)} · $${costUsd.toFixed(4)} · ${percent.toFixed(0)}% context`}
    >
      <Progress.Indicator
        className={`h-full rounded-lg transition-all duration-500 ${progressColor(percent)}`}
        style={{ width: `${percent}%` }}
      />
    </Progress.Root>
  );
}
