import { type DragEvent, useCallback, useRef, useState } from 'react';

type AttachedFile = { path: string; dataUrl: string | null };
type SetAttachedFiles = React.Dispatch<React.SetStateAction<AttachedFile[]>>;

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];

function isImagePath(path: string): boolean {
  return IMAGE_EXTS.includes(path.slice(path.lastIndexOf('.')).toLowerCase());
}

export type ChatDropzone = {
  isDragging: boolean;
  dragHandlers: {
    onDragOver: (e: DragEvent) => void;
    onDragEnter: (e: DragEvent) => void;
    onDragLeave: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
  };
};

// Make the whole chat area a drop target (desktop-app style): dragging files in
// flips `isDragging` (the overlay), dropping them resolves each absolute path via
// `window.api.getPathForFile`, reads images as data URLs (same pipeline as the
// picker's handleAttach), and appends — deduped by path so the same file dropped
// twice doesn't double-add. A depth counter guards against child enter/leave
// flicker so the overlay only clears when the cursor truly leaves the container.
export function useChatDropzone(setAttachedFiles: SetAttachedFiles): ChatDropzone {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const onDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragging(false);
    }
  }, []);

  const onDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const resolved: AttachedFile[] = [];
      for (const file of files) {
        const path = window.api.getPathForFile(file);
        if (!path) continue;
        const dataUrl = isImagePath(path) ? await window.api.readImageAsDataUrl(path) : null;
        resolved.push({ path, dataUrl });
      }
      if (resolved.length === 0) return;

      setAttachedFiles((prev) => {
        const seen = new Set(prev.map((f) => f.path));
        const additions = resolved.filter((f) => !seen.has(f.path));
        return additions.length > 0 ? [...prev, ...additions] : prev;
      });
    },
    [setAttachedFiles],
  );

  return { isDragging, dragHandlers: { onDragOver, onDragEnter, onDragLeave, onDrop } };
}
