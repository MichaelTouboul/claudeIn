import { useEffect, useRef, useState } from 'react';

export type UseResizableSidebarOptions = {
  initial?: number;
  min?: number;
  max?: number;
};

export function useResizableSidebar({
  initial = 288,
  min = 200,
  max = 500,
}: UseResizableSidebarOptions = {}) {
  const [width, setWidth] = useState(initial);
  const ref = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setWidth(Math.min(Math.max(e.clientX, min), max));
    };
    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [min, max]);

  const startDrag = () => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return { width, ref, startDrag };
}
