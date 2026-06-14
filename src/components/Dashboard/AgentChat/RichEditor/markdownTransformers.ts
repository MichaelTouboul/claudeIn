import {
  BOLD_STAR,
  INLINE_CODE,
  ORDERED_LIST,
  type Transformer,
  UNORDERED_LIST,
} from '@lexical/markdown';

/** The ONE source of truth — drives both serialization and markdown-shortcuts. */
export const CHAT_TRANSFORMERS: Transformer[] = [
  UNORDERED_LIST,
  ORDERED_LIST,
  BOLD_STAR,
  INLINE_CODE,
];
