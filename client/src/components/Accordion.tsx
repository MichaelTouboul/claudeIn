import { useState } from "react";
import { ChevronRight } from "lucide-react";

export default function Accordion({
  label,
  icon,
  count,
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  flex = false,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: () => void;
  flex?: boolean;
  children: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
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
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 hover:bg-gray-800/50 transition-colors border-b border-gray-800/50 shrink-0"
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
      {isOpen && (
        <div className={`${flex ? "flex-1 min-h-0 overflow-y-auto" : ""} mt-0.5`}>
          {children}
        </div>
      )}
    </div>
  );
}
