import { useInteractive } from '../lib/useInteractive';

function TabButton({ tab, active, onSelect }) {
  const { hover, bind } = useInteractive();
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onSelect(tab.value)}
      {...bind}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        height: 38,
        padding: '0 4px',
        marginBottom: -1,
        border: 'none',
        background: 'transparent',
        color: active ? 'var(--text-primary)' : hover ? 'var(--text-secondary)' : 'var(--text-tertiary)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-base)',
        fontWeight: active ? 'var(--weight-semibold)' : 'var(--weight-medium)',
        cursor: 'pointer',
        borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
        transition: 'color var(--duration-fast) var(--ease-standard)',
      }}
    >
      {tab.icon ? <span style={{ display: 'flex' }}>{tab.icon}</span> : null}
      {tab.label}
      {tab.count !== undefined && tab.count !== null ? (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-2xs)',
            color: active ? 'var(--accent-text)' : 'var(--text-tertiary)',
            background: active ? 'var(--accent-subtle)' : 'var(--surface-3)',
            borderRadius: 'var(--radius-pill)',
            padding: '1px 6px',
          }}
        >
          {tab.count}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Underline tab bar. `tabs` is `{ value, label, icon?, count? }[]`; controlled
 * via `value` / `onChange`.
 */
export function Tabs({ tabs = [], value, onChange, style = {}, ...props }) {
  return (
    <div
      role="tablist"
      {...props}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 'var(--space-5)',
        borderBottom: '1px solid var(--border)',
        ...style,
      }}
    >
      {tabs.map((tab) => (
        <TabButton key={tab.value} tab={tab} active={tab.value === value} onSelect={onChange} />
      ))}
    </div>
  );
}
