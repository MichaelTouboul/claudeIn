import { Edit3, RefreshCw, Save, Star, Trash2, X } from 'lucide-react';
import type { AgentFile } from '@/types/agent.types';
import { Badge } from '@/components/_ui/Badge';

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
            className="text-lg font-bold"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}
          >
            {agent.id}
          </h2>
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className="p-1 rounded hover:bg-gray-800 transition-colors"
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star size={16} className={isFavorite ? "text-yellow-400 fill-yellow-400" : "text-gray-600 hover:text-yellow-400"} />
            </button>
          )}
          <Badge variant={agent.frontmatter.model === "opus" ? "purple" : "blue"}>
            {agent.frontmatter.model || "inherit"}
          </Badge>
          {editing && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded"
              style={{
                color: 'var(--color-accent)',
                background: 'var(--color-accent-dim)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.05em',
                border: '1px solid rgba(6,182,212,0.15)',
              }}
            >
              EDITING
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={onCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all duration-150"
                style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; e.currentTarget.style.background = 'var(--color-surface-3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <X size={14} />
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white rounded-md transition-all duration-150 disabled:opacity-40 glow-cyan"
                style={{ background: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}
              >
                <Save size={14} />
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onRefreshAgent}
                disabled={refreshing}
                className="p-1.5 rounded-md transition-all duration-150 disabled:opacity-40"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; e.currentTarget.style.background = 'var(--color-surface-3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                title="Refresh from disk"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              </button>
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all duration-150"
                style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; e.currentTarget.style.background = 'var(--color-surface-3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <Edit3 size={14} />
                Edit
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--color-danger)', fontFamily: 'var(--font-mono)' }}>Confirm?</span>
                  <button
                    onClick={onDelete}
                    className="px-3 py-1.5 text-sm text-white rounded-md transition-colors"
                    style={{ background: '#dc2626', fontFamily: 'var(--font-mono)' }}
                  >
                    Delete
                  </button>
                  <button
                    onClick={onCancelDelete}
                    className="p-1 transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onConfirmDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all duration-150"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="text-xs font-mono mt-1.5" style={{ color: 'var(--color-text-muted)' }}>{agent.filePath}</div>
    </div>
  );
}
