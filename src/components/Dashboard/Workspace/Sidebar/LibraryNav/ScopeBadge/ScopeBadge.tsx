import { Badge, type BadgeVariant } from '@/components/_ui/Badge';

/** The scopes a library item can carry — project, user, or a plugin source. */
export const ItemScope = { Project: 'project', User: 'user', Plugin: 'plugin' } as const;
export type ItemScope = (typeof ItemScope)[keyof typeof ItemScope];

export type ScopeBadgeProps = {
  scope: ItemScope;
  /** The owning plugin pack name, shown for `plugin` scope. */
  source?: string | null;
};

type ScopePresentation = { variant: BadgeVariant; dot: boolean; label: (source?: string | null) => string };

// Enum → presentation map (no fallback chain). Matches library.html's ScopeBadge:
// project → blue, user → neutral gray, plugin → purple dot + the source name.
const SCOPE_PRESENTATION: Record<ItemScope, ScopePresentation> = {
  [ItemScope.Project]: { variant: 'blue', dot: false, label: () => 'project' },
  [ItemScope.User]: { variant: 'gray', dot: false, label: () => 'user' },
  [ItemScope.Plugin]: { variant: 'purple', dot: true, label: (source) => source ?? 'plugin' },
};

/** Strip the conventional `-pack` suffix so the badge reads compactly. */
function shortSource(source: string | null | undefined): string | null {
  return source ? source.replace(/-pack$/, '') : null;
}

/**
 * The scope (+ plugin source) badge a Library item carries, per library.html:
 * a tinted pill reading `project` / `user`, or a dotted purple pill naming the
 * plugin pack for plugin-scoped items. One presentation map, no fallback chain.
 */
export function ScopeBadge({ scope, source }: ScopeBadgeProps) {
  const p = SCOPE_PRESENTATION[scope];
  return (
    <Badge variant={p.variant} dot={p.dot} className="shrink-0">
      {p.label(shortSource(source))}
    </Badge>
  );
}
