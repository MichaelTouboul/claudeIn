export type ResizeHandleProps = {
  onMouseDown: () => void;
};

export function ResizeHandle({ onMouseDown }: ResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      tabIndex={0}
      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors focus:outline-none focus:bg-accent/40"
      onMouseDown={(e) => {
        e.preventDefault();
        onMouseDown();
      }}
    />
  );
}
