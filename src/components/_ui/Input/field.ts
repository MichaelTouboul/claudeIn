import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Shared field chrome for Input / Textarea / Select.
 * `filled` = surface + border + focus ring; `bare` = transparent borderless.
 */
export const field = cva(
  'w-full text-fg placeholder:text-fg-subtle focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      size: {
        sm: 'text-xs px-2 py-1',
        md: 'text-sm px-2.5 py-1.5',
      },
      font: {
        sans: 'font-sans',
        mono: 'font-mono',
      },
      variant: {
        filled:
          'rounded border border-border bg-surface-2 focus-visible:ring-1 focus-visible:ring-accent focus-visible:border-accent transition-colors',
        bare: 'bg-transparent border-0 px-0 py-0',
      },
    },
    defaultVariants: {
      size: 'md',
      font: 'sans',
      variant: 'filled',
    },
  },
);

export type FieldVariantProps = VariantProps<typeof field>;
