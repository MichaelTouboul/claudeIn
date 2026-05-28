import type { AgentFile, AgentFrontmatter } from '@/types/agent.types';

import { EditField } from '../EditField/EditField';
import { fieldDisplayValue,FIELDS } from '../fields';

export type FrontmatterTableProps = {
  agent: AgentFile;
  editing: boolean;
  draft: Partial<AgentFrontmatter>;
  onDraftChange: (key: string, val: unknown) => void;
};

export function FrontmatterTable({ agent, editing, draft, onDraftChange }: FrontmatterTableProps) {
  return (
    <div className="space-y-4">
      <table className="w-full text-sm">
        <tbody>
          {FIELDS.map((field, idx) => (
            <tr
              key={field.key}
              style={{
                borderBottom: '1px solid var(--color-border-subtle)',
                background: idx % 2 === 1 ? 'var(--color-surface-1)' : 'transparent',
              }}
            >
              <td
                className="py-2.5 pr-4 font-medium w-40 align-top"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.02em' }}
              >
                {field.label}
              </td>
              <td className="py-2.5" style={{ color: 'var(--color-text-primary)' }}>
                {editing ? (
                  <EditField
                    field={field}
                    value={draft[field.key] !== undefined ? draft[field.key] : agent.frontmatter[field.key]}
                    onChange={(val) => onDraftChange(field.key, val)}
                  />
                ) : (
                  fieldDisplayValue(agent.frontmatter, field.key)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
