export type PanelResizeHandleProps = {
  onMouseDown: () => void;
};

// Left-edge drag handle for the right-side UtilityPanel. Mirrors the sidebar's
// ResizeHandle but pinned to the LEFT edge (the panel grows toward the left).
export function PanelResizeHandle({ onMouseDown }: PanelResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      tabIndex={0}
      className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors focus:outline-none focus:bg-accent/40 z-10"
      onMouseDown={(e) => {
        e.preventDefault();
        onMouseDown();
      }}
    />
  );
}
