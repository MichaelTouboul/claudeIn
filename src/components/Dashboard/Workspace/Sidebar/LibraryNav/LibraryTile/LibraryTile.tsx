import { type ReactNode } from 'react';

export type LibraryTileProps = {
  /** The icon glyph rendered centered in the tile. */
  icon: ReactNode;
  /** A design-system CSS color var (e.g. `var(--color-active)`) for the hue. */
  color: string;
};

/**
 * A 30×30 rounded, hue-tinted tile for a Library item (skill / hook / MCP),
 * mirroring AgentTile's treatment so every category's rows share one grammar.
 * The hue is a passed-in design-system color var; the `color-mix` tint/border
 * reference it so no raw value lives here.
 */
export function LibraryTile({ icon, color }: LibraryTileProps) {
  return (
    <span
      className="relative flex shrink-0 items-center justify-center rounded-md"
      style={{
        width: 30,
        height: 30,
        color,
        background: `color-mix(in srgb, ${color} 16%, var(--color-surface-2))`,
        border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
      }}
    >
      {icon}
    </span>
  );
}
