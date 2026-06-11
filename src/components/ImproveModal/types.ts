import type { ImproveContextTarget, ImproveType } from '@/types/improve.types';

/** One message in the modal's scoping chat (local UI state). */
export interface ChatMessage {
  /** Stable id for React keys (never the array index). */
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

/** Inputs to derive an `ImproveRequest` from the conversation. */
export interface BuildImproveRequestArgs {
  type: ImproveType;
  target: ImproveContextTarget | null;
  messages: ChatMessage[];
}
