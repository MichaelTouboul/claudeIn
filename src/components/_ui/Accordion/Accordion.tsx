import { useState } from "react";
import { ChevronRight, RefreshCw } from "lucide-react";

export type AccordionProps = {
  label: string;
  icon: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: () => void;
  onRefresh?: () => void;
  flex?: boolean;
  children: React.ReactNode;
};

export function Accordion({
  label,
  icon,
  count,
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  onRefresh,
  flex = false,
  children,
}: AccordionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [hovered, setHovered] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleToggle = () => {
    if (onToggle) onToggle();
    else setInternalOpen(!internalOpen);
  };

  return (
    <div
      className={`${isOpen && flex ? "flex-1 min-h-0 flex flex-col" : ""}`}
      style={isOpen && flex ? undefined : { flex: "none" }}
    >
      <div
        className="flex items-center shrink-0"
        style={{
          borderBottom: '1px solid var(--color-border-subtle)',
          borderLeft: isOpen ? '2px solid var(--color-accent)' : '2px solid transparent',
          transition: 'border-color 0.2s ease',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <button
          onClick={handleToggle}
          className="flex-1 flex items-center gap-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors"
          style={{
            color: hovered ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            background: hovered ? 'var(--color-surface-2)' : 'transparent',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <ChevronRight
            size={11}
            className="shrink-0"
            style={{
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
          {icon}
          <span>{label}</span>
          {count !== undefined && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontFeatureSettings: "'tnum' 1",
                color: 'var(--color-text-muted)',
                fontSize: '10px',
                fontWeight: 400,
                textTransform: 'none',
              }}
            >
              {count}
            </span>
          )}
        </button>
        {onRefresh && isOpen && hovered && (
          <button
            onClick={(e) => { e.stopPropagation(); onRefresh(); }}
            className="p-1 mr-1 transition-colors"
            style={{ color: hovered ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}
            title={`Refresh ${label.toLowerCase()}`}
          >
            <RefreshCw size={11} />
          </button>
        )}
      </div>
      {isOpen && (
        <div className={`${flex ? "flex-1 min-h-0 overflow-y-auto" : ""} mt-0.5`}>
          {children}
        </div>
      )}
    </div>
  );
}
