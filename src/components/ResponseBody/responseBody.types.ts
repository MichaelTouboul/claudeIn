/** An action a block exposes in the BlockShell toolbar. */
export type BlockAction =
  | { id: string; label: string; kind: 'local'; run: () => void }
  | { id: string; label: string; kind: 'claude'; prompt: (raw: string) => string };

/** Props every block component receives. `TData` is the parsed payload. */
export type BlockProps<TData = unknown> = {
  data: TData;
  /** Original source string — rendered as a fallback by the error boundary. */
  raw: string;
  /** Lets a block publish its toolbar actions to the enclosing BlockShell. */
  registerActions: (actions: BlockAction[]) => void;
};
