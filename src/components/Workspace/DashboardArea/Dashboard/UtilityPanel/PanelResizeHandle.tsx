import type { KeyboardEvent } from 'react';

/** Px the panel grows/shrinks per ArrowLeft/ArrowRight keypress. */
const KEY_STEP = 24;

export type PanelResizeHandleProps = {
  /** Begin a pointer drag (mirrors the sidebar ResizeHandle). */
  onMouseDown: () => void;
  /** Live panel width, surfaced to AT via aria-valuenow. */
  width: number;
  /** Clamp bounds, surfaced via aria-valuemin / aria-valuemax. */
  min: number;
  max: number;
  /** Apply a new width (already clamped by the store). */
  onResize: (px: number) => void;
};

// Left-edge drag handle for the right-side UtilityPanel. Mirrors the sidebar's
// ResizeHandle but pinned to the LEFT edge (the panel grows toward the left).
// Keyboard-resizable: the element is focusable (tabIndex 0) and ArrowLeft/Right
// resize it, so the focus affordance is not inert. Exposes the ARIA valuenow/
// min/max contract a resizable separator must carry.
export function PanelResizeHandle({ onMouseDown, width, min, max, onResize }: PanelResizeHandleProps) {
  // Panel is docked right and grows leftward, so ArrowLeft widens, ArrowRight
  // narrows — matching the on-screen direction of the drag.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onResize(width + KEY_STEP);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onResize(width - KEY_STEP);
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      aria-valuenow={Math.round(width)}
      aria-valuemin={min}
      aria-valuemax={Math.round(max)}
      tabIndex={0}
      className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors focus:outline-none focus:bg-accent/40 z-10"
      onMouseDown={(e) => {
        e.preventDefault();
        onMouseDown();
      }}
      onKeyDown={onKeyDown}
    />
  );
}
