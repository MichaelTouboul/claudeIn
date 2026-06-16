import { Settings } from 'lucide-react';

import { Badge } from '@/components/_ui/Badge';
import type { AgentFrontmatter } from '@/lib/types';

import { isInherited, RAIL_FIELDS, type RailField, RailFieldKind } from '../../config/railFields';
import { DetailCard } from '../../DetailCard/DetailCard';
import { ConfigEditField } from './ConfigEditField';
import { ConfigRow } from './ConfigRow';

export type ConfigCardProps = {
  frontmatter: AgentFrontmatter;
  editing: boolean;
  draft: Partial<AgentFrontmatter>;
  onChange: (key: keyof AgentFrontmatter & string, value: unknown) => void;
};

/** Read the effective value for a field (draft override → saved frontmatter). */
function effectiveValue(
  field: RailField,
  frontmatter: AgentFrontmatter,
  draft: Partial<AgentFrontmatter>,
): unknown {
  return field.key in draft ? draft[field.key] : frontmatter[field.key];
}

function ViewValue({ field, value }: { field: RailField; value: unknown }) {
  if (field.kind === RailFieldKind.Switch) {
    return value ? <Badge variant="green" dot>yes</Badge> : <span>no</span>;
  }
  return <>{String(value)}</>;
}

export function ConfigCard({ frontmatter, editing, draft, onChange }: ConfigCardProps) {
  return (
    <DetailCard icon={<Settings size={15} />} title="Configuration" flush>
      {editing ? (
        <div className="flex flex-col gap-3.5 py-3.5">
          {RAIL_FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <span className="text-xs text-fg-subtle">{field.label}</span>
              <ConfigEditField
                field={field}
                value={effectiveValue(field, frontmatter, draft)}
                onChange={(v) => onChange(field.key, v)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div>
          {RAIL_FIELDS.map((field) => {
            const value = effectiveValue(field, frontmatter, draft);
            const inherited = field.kind !== RailFieldKind.Switch && isInherited(value);
            return (
              <ConfigRow key={field.key} label={field.label} inherited={inherited}>
                <ViewValue field={field} value={value} />
              </ConfigRow>
            );
          })}
        </div>
      )}
    </DetailCard>
  );
}
