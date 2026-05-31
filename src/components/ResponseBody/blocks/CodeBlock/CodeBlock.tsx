import { BlockShell } from '../../BlockShell/BlockShell';
import type { BlockAction } from '../../responseBody.types';

export type CodeBlockData = { lang: string | null; src: string };
export type CodeBlockProps = { data: CodeBlockData; raw: string };

// `raw` stays on CodeBlockProps for contract uniformity but is unused in this
// reference block, so it is not destructured (no unused-var lint error).
export function CodeBlock({ data }: CodeBlockProps) {
  const copy: BlockAction = {
    id: 'copy',
    label: 'Copy',
    kind: 'local',
    run: () => void navigator.clipboard?.writeText(data.src),
  };

  return (
    <BlockShell>
      {(register) => {
        register([copy]);
        return (
          <div>
            {data.lang ? (
              <div
                className="px-3 pt-2 text-xs font-mono"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {data.lang}
              </div>
            ) : null}
            <pre
              className="overflow-x-auto px-3 pb-3 pt-1 text-sm leading-relaxed"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}
            >
              <code>{data.src}</code>
            </pre>
          </div>
        );
      }}
    </BlockShell>
  );
}
