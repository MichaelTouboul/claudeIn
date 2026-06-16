import { Wrench } from 'lucide-react';

import { Badge } from '@/components/_ui/Badge';
import { Tag } from '@/components/_ui/Tag';
import type { AgentFrontmatter } from '@/lib/types';

import { toToolList } from '../../config/railFields';
import { DetailCard } from '../../DetailCard/DetailCard';

export type ToolsCardProps = {
  frontmatter: AgentFrontmatter;
};

/** The "Tools" card — tools as chips, skills as badges. */
export function ToolsCard({ frontmatter }: ToolsCardProps) {
  const tools = toToolList(frontmatter.tools);
  const skills = frontmatter.skills ?? [];

  return (
    <DetailCard
      icon={<Wrench size={15} />}
      title="Tools"
      action={<span className="font-mono text-[13px] text-fg-subtle">{tools.length}</span>}
    >
      {tools.length === 0 ? (
        <p className="text-xs text-fg-subtle">All tools (inherited)</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tools.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      )}

      {skills.length > 0 ? (
        <>
          <div className="mt-4 mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">
            Skills
          </div>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <Badge key={s} variant="green">
                {s}
              </Badge>
            ))}
          </div>
        </>
      ) : null}
    </DetailCard>
  );
}
