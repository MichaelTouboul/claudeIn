import { type PointerEvent as ReactPointerEvent, useState } from 'react';

import { useConsoleStore } from '@/store/dashboard/useConsoleStore';

/**
 * Thin drag strip along the TOP edge of the Console. Dragging UP grows the
 * Console (DOWN shrinks it); the store's setHeight clamps to [MIN, MAX].
 */
export function ConsoleResizeHandle() {
  const setHeight = useConsoleStore((s) => s.setHeight);
  const [hover, setHover] = useState(false);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = useConsoleStore.getState().height;

    const onMove = (ev: PointerEvent) => {
      setHeight(startHeight - (ev.clientY - startY));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize console"
      style={{
        height: 5,
        cursor: 'row-resize',
        background: hover ? 'var(--color-accent)' : 'var(--color-border)',
        transition: 'background 120ms',
      }}
    />
  );
}
