import { useInteractive } from '../lib/useInteractive';

/**
 * Multi-line text field. Same border/focus language as Input. Use `mono` for
 * code/prompt entry.
 */
export function Textarea({ invalid = false, mono = false, rows = 4, disabled = false, style = {}, ...props }) {
  const { hover, focus, bind } = useInteractive();

  let borderColor = 'var(--border-strong)';
  if (invalid) borderColor = 'var(--danger)';
  else if (focus) borderColor = 'var(--accent)';
  else if (hover) borderColor = 'var(--neutral-500)';

  return (
    <textarea
      rows={rows}
      disabled={disabled}
      {...bind}
      {...props}
      style={{
        display: 'block',
        width: '100%',
        padding: 'var(--space-3)',
        background: 'var(--surface-inset)',
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: focus ? '0 0 0 3px var(--accent-subtle)' : 'none',
        color: 'var(--text-primary)',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
        fontSize: 'var(--text-base)',
        lineHeight: 'var(--leading-base)',
        resize: 'vertical',
        outline: 'none',
        opacity: disabled ? 0.5 : 1,
        transition: 'border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)',
        ...style,
      }}
    />
  );
}
