export type QuickReply = {
  label: string;
  value: string;
  variant: 'accept' | 'deny' | 'neutral';
};

/** A user message pending in the send queue. The `id` is stable across re-renders so React
 *  diffs work correctly when items are added/removed.
 */
export type QueueItem = {
  id: string;
  text: string;
};
