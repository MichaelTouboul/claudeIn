import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Star, StarOff } from "lucide-react";

export default function ItemContextMenu({
  isFavorite,
  onToggleFavorite,
}: {
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1 rounded text-gray-600 hover:text-gray-300 hover:bg-gray-700 transition-colors"
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 py-1 overflow-hidden">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onToggleFavorite();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-yellow-400 transition-colors hover:bg-gray-700"
          >
            {isFavorite ? <StarOff size={12} /> : <Star size={12} />}
            {isFavorite ? "Remove favorite" : "Add to favorites"}
          </button>
        </div>
      )}
    </div>
  );
}
