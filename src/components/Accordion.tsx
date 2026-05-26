import { useState } from "react";
import { ChevronRight, RefreshCw } from "lucide-react";

export default function Accordion({
  label,
  icon,
  count,
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  onRefresh,
  flex = false,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: () => void;
  onRefresh?: () => void;
  flex?: boolean;
  children: React.ReactNode;
}) {
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
        className="flex items-center border-b border-gray-800/50 shrink-0"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <button
          onClick={handleToggle}
          className="flex-1 flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 hover:bg-gray-800/50 transition-colors"
        >
          <ChevronRight
            size={11}
            className={`transition-transform shrink-0 ${isOpen ? "rotate-90" : ""}`}
          />
          {icon}
          <span>{label}</span>
          {count !== undefined && (
            <span className="text-gray-600 font-normal normal-case">{count}</span>
          )}
        </button>
        {onRefresh && isOpen && hovered && (
          <button
            onClick={(e) => { e.stopPropagation(); onRefresh(); }}
            className="p-1 mr-1 text-gray-500 hover:text-gray-200 transition-colors"
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
