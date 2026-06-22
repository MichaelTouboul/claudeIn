/**
 * Maps a DOM element back to its React component + source file. Re-exported from
 * the shared electron type home so `ImproveContextTarget.chain` (which crosses
 * the IPC boundary) and `elementToComponent` agree on one shape.
 */
export type { ComponentSource } from "../../../electron/types/improve.types";
