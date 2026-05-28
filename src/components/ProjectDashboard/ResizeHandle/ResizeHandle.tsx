export type ResizeHandleProps = {
  onMouseDown: () => void;
};

export function ResizeHandle({ onMouseDown }: ResizeHandleProps) {
  return (
    <div
      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-cyan-500/30 transition-colors"
      onMouseDown={(e) => {
        e.preventDefault();
        onMouseDown();
      }}
    />
  );
}
