import { Edit3, RefreshCw, Save, Star, Trash2, X } from 'lucide-react';

import { Badge } from '@/components/_ui/Badge';
import { Button } from '@/components/_ui/Button';
import type { AgentFile } from '@/types/agent.types';

export type DetailHeaderProps = {
  agent: AgentFile;
  editing: boolean;
  saving: boolean;
  refreshing: boolean;
  confirmDelete: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onRefreshAgent: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
};

export function DetailHeader({
  agent,
  editing,
  saving,
  refreshing,
  confirmDelete,
  isFavorite,
  onToggleFavorite,
  onEdit,
  onSave,
  onCancel,
  onRefreshAgent,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
}: DetailHeaderProps) {
  return (
    <div
      className="border-b px-6 py-4"
      style={{
        background: editing ? 'rgba(6,182,212,0.04)' : 'var(--color-surface-1)',
        borderColor: editing ? 'rgba(6,182,212,0.2)' : 'var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: `var(--agent-color, var(--color-accent))` }}
          />
          <h2
            className="text-lg font-bold text-fg"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em' }}
          >
            {agent.id}
          </h2>
          {onToggleFavorite ? <button
              onClick={onToggleFavorite}
              className="p-1 rounded hover:bg-surface-2 transition-colors"
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star size={16} className={isFavorite ? "text-yellow-400 fill-yellow-400" : "text-fg-subtle hover:text-yellow-400"} />
            </button> : null}
          <Badge variant={agent.frontmatter.model === "opus" ? "purple" : "blue"}>
            {agent.frontmatter.model || "inherit"}
          </Badge>
          {editing ? <span
              className="text-xs font-medium px-2 py-0.5 rounded text-accent bg-accent-dim"
              style={{
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.05em',
                border: '1px solid rgba(6,182,212,0.15)',
              }}
            >
              EDITING
            </span> : null}
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button intent="outline" onClick={onCancel}>
                <X size={14} />
                Cancel
              </Button>
              <Button
                intent="primary"
                onClick={onSave}
                disabled={saving}
                className="glow-cyan"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <Save size={14} />
                {saving ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button
                intent="ghost"
                size="icon"
                onClick={onRefreshAgent}
                disabled={refreshing}
                title="Refresh from disk"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              </Button>
              <Button intent="outline" onClick={onEdit}>
                <Edit3 size={14} />
                Edit
              </Button>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-danger" style={{ fontFamily: 'var(--font-mono)' }}>Confirm?</span>
                  <Button
                    intent="danger-solid"
                    onClick={onDelete}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    Delete
                  </Button>
                  <Button intent="ghost" size="icon" onClick={onCancelDelete}>
                    <X size={14} />
                  </Button>
                </div>
              ) : (
                <Button intent="danger" size="icon" onClick={onConfirmDelete}>
                  <Trash2 size={14} />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="text-xs font-mono mt-1.5 text-fg-subtle">{agent.filePath}</div>
    </div>
  );
}
