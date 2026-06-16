import type { ImproveContextTarget, ImproveType } from '@/lib/types';

/** An image attached to a composer turn (mirrors the main chat's shape). */
export interface AttachedImage {
  /** Absolute path on disk (picked/dropped file, or a persisted pasted image). */
  path: string;
  /** Data URL for the thumbnail preview, or null if unreadable. */
  dataUrl: string | null;
}

/** One message in the modal's scoping chat (local UI state). */
export interface ChatMessage {
  /** Stable id for React keys (never the array index). */
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Absolute image paths attached to this turn (user turns only). */
  images?: string[];
}

/** Inputs to derive an `ImproveRequest` from the conversation. */
export interface BuildImproveRequestArgs {
  type: ImproveType;
  target: ImproveContextTarget | null;
  messages: ChatMessage[];
}
