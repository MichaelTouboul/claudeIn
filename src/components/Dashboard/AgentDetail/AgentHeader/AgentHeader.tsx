import { Badge } from '@/components/_ui/Badge';
import type { AgentFile } from '@/lib/types';

import { HeaderActions } from './HeaderActions';
import { IdentityTile } from './IdentityTile';
import { PathChip } from './PathChip';

export type AgentHeaderProps = {
  agent: AgentFile;
  editing: boolean;
  saving: boolean;
  onRun: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDuplicate: () => void;
  onReveal: () => void;
  onDelete: () => void;
};

/**
 * Agent-config header: hue identity tile + name, a scope badge, an "editing"
 * badge in edit mode, a mono file-path chip with copy, and the action cluster.
 */
export function AgentHeader({
  agent,
  editing,
  saving,
  onRun,
  onEdit,
  onSave,
  onCancel,
  onDuplicate,
  onReveal,
  onDelete,
}: AgentHeaderProps) {
  const scope = agent.scope ?? 'user';
  return (
    <div className="flex items-start gap-4">
      <IdentityTile color={agent.frontmatter.color} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <h1
            className="truncate text-[22px] font-semibold text-fg"
            style={{ letterSpacing: '-0.01em' }}
          >
            {agent.id}
          </h1>
          <Badge variant="gray">{scope}</Badge>
          {editing ? <Badge variant="cyan" dot>editing</Badge> : null}
        </div>
        <PathChip path={agent.filePath} />
      </div>
      <HeaderActions
        editing={editing}
        saving={saving}
        onRun={onRun}
        onEdit={onEdit}
        onSave={onSave}
        onCancel={onCancel}
        onDuplicate={onDuplicate}
        onReveal={onReveal}
        onDelete={onDelete}
      />
    </div>
  );
}
