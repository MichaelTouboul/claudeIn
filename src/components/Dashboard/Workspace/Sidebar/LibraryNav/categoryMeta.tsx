import { Bot, Plug, Sparkles, Zap } from 'lucide-react';
import type { ReactNode } from 'react';

import { LibraryCategory } from '@/store/dashboard/useDashboardUIStore';

export type CategoryMeta = {
  label: string;
  icon: ReactNode;
};

/**
 * Per-category presentation, keyed by the LibraryCategory enum — one
 * authoritative behavior map (no fallback chains). Icons/colors mirror
 * library.html's category nav (Bot/Sparkles/Zap/Plug, info/active/warning/accent).
 */
export const CATEGORY_META: Record<LibraryCategory, CategoryMeta> = {
  [LibraryCategory.Agents]: {
    label: 'Agents',
    icon: <Bot size={17} className="text-[var(--color-info)]" />,
  },
  [LibraryCategory.Skills]: {
    label: 'Skills',
    icon: <Sparkles size={17} className="text-active" />,
  },
  [LibraryCategory.Hooks]: {
    label: 'Hooks',
    icon: <Zap size={17} className="text-[var(--color-warning)]" />,
  },
  [LibraryCategory.Mcp]: {
    label: 'MCP servers',
    icon: <Plug size={17} style={{ color: 'var(--color-accent-text)' }} />,
  },
};

/** Iteration order for the category list (Agents → Skills → Hooks → MCP). */
export const CATEGORY_ORDER: LibraryCategory[] = [
  LibraryCategory.Agents,
  LibraryCategory.Skills,
  LibraryCategory.Hooks,
  LibraryCategory.Mcp,
];
