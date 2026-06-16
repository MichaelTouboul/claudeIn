import { type ClipboardEvent, type DragEvent, useCallback, useRef, useState } from 'react';

import { FilePickerKind } from '@/lib/types';

import type { AttachedImage } from '../types';

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];

function isImagePath(path: string): boolean {
  return IMAGE_EXTS.includes(path.slice(path.lastIndexOf('.')).toLowerCase());
}

export type ImproveChatAttach = {
  attached: AttachedImage[];
  isDragging: boolean;
  /** Open the native picker (image-scoped) and append the chosen images. */
  pick: () => Promise<void>;
  /** Remove the attachment at `index`. */
  remove: (index: number) => void;
  /** Clear all attachments (after a send). */
  clear: () => void;
  dragHandlers: {
    onDragOver: (e: DragEvent) => void;
    onDragEnter: (e: DragEvent) => void;
    onDragLeave: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
  };
  /** Paste handler: persists clipboard image data to a temp file then attaches it. */
  onPaste: (e: ClipboardEvent) => void;
};

/**
 * Scoping-chat composer attach pipeline — mirrors the main chat's image flow
 * (`useChatDropzone` + `useAgentChatActions.handleAttach`): picked/dropped files
 * resolve an absolute path via `getPathForFile`, read as a data URL for the
 * thumbnail, and append deduped by path. Pasted clipboard image data has no
 * on-disk path, so it's persisted via `saveImageFromDataUrl` first.
 */
export function useImproveChatAttach(): ImproveChatAttach {
  const [attached, setAttached] = useState<AttachedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  const append = useCallback((additions: AttachedImage[]) => {
    if (additions.length === 0) return;
    setAttached((prev) => {
      const seen = new Set(prev.map((f) => f.path));
      const fresh = additions.filter((f) => !seen.has(f.path));
      return fresh.length > 0 ? [...prev, ...fresh] : prev;
    });
  }, []);

  const resolvePath = useCallback(async (path: string): Promise<AttachedImage | null> => {
    if (!isImagePath(path)) return null;
    const dataUrl = await window.api.readImageAsDataUrl(path);
    return { path, dataUrl };
  }, []);

  const pick = useCallback(async () => {
    const paths = await window.api.openFilePicker(FilePickerKind.Image);
    const resolved: AttachedImage[] = [];
    for (const p of paths) {
      const file = await resolvePath(p);
      if (file) resolved.push(file);
    }
    append(resolved);
  }, [append, resolvePath]);

  const remove = useCallback((index: number) => {
    setAttached((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => setAttached([]), []);

  const onDragOver = useCallback((e: DragEvent) => e.preventDefault(), []);
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
      const resolved: AttachedImage[] = [];
      for (const file of Array.from(e.dataTransfer.files)) {
        const path = window.api.getPathForFile(file);
        if (!path) continue;
        const item = await resolvePath(path);
        if (item) resolved.push(item);
      }
      append(resolved);
    },
    [append, resolvePath],
  );

  const onPaste = useCallback(
    (e: ClipboardEvent) => {
      const images = Array.from(e.clipboardData.items).filter((it) =>
        it.type.startsWith('image/'),
      );
      if (images.length === 0) return;
      e.preventDefault();
      void (async () => {
        const resolved: AttachedImage[] = [];
        for (const item of images) {
          const blob = item.getAsFile();
          if (!blob) continue;
          const dataUrl = await blobToDataUrl(blob);
          const path = await window.api.saveImageFromDataUrl(dataUrl);
          if (path) resolved.push({ path, dataUrl });
        }
        append(resolved);
      })();
    },
    [append],
  );

  return {
    attached,
    isDragging,
    pick,
    remove,
    clear,
    dragHandlers: { onDragOver, onDragEnter, onDragLeave, onDrop },
    onPaste,
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
