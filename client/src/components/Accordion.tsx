import { useState } from "react";
import { ChevronRight } from "lucide-react";

export default function Accordion({
  label,
  icon,
  count,
  defaultOpen = false,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors"
      >
        <ChevronRight
          size={11}
          className={`transition-transform shrink-0 ${open ? "rotate-90" : ""}`}
        />
        {icon}
        <span>{label}</span>
        {count !== undefined && (
          <span className="text-gray-600 font-normal normal-case">{count}</span>
        )}
      </button>
      {open && <div className="mt-0.5">{children}</div>}
    </div>
  );
}
