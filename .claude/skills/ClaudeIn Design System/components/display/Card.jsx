import { useInteractive } from '../lib/useInteractive';

/**
 * Surface container. `interactive` adds hover lift + pointer; `padding`
 * accepts a spacing token number (maps to --space-N) or a CSS value.
 */
export function Card({ interactive = false, selected = false, padding = 'var(--space-4)', as = 'div', style = {}, children, ...props }) {
  const { hover, bind } = useInteractive();
  const Tag = as;

  return (
    <Tag
      {...(interactive ? bind : {})}
      {...props}
      style={{
        background: 'var(--surface-2)',
        border: `1px solid ${selected ? 'var(--accent-border)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding,
        boxShadow: interactive && hover ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        transform: interactive && hover ? 'translateY(-1px)' : 'none',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'transform var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)',
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
