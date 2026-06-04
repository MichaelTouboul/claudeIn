import { create } from 'zustand';

/** Minimum Console height in px. */
export const CONSOLE_MIN_HEIGHT = 120;
/** Default Console height in px when first opened. */
export const CONSOLE_DEFAULT_HEIGHT = 240;

/** Max Console height: 80% of the current viewport, computed at set-time. */
function maxConsoleHeight(): number {
  return Math.round(window.innerHeight * 0.8);
}

function clampHeight(px: number): number {
  return Math.min(Math.max(px, CONSOLE_MIN_HEIGHT), maxConsoleHeight());
}

type ConsoleState = {
  /** Whether the Console panel is open. Closed by default. */
  open: boolean;
  /** Open height in px (clamped on every set). */
  height: number;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setHeight: (px: number) => void;
};

export const useConsoleStore = create<ConsoleState>((set) => ({
  open: false,
  height: CONSOLE_DEFAULT_HEIGHT,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
  setHeight: (px) => set({ height: clampHeight(px) }),
}));
