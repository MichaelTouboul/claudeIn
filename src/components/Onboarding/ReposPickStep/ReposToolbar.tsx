import { Search } from "lucide-react";

import { Badge } from "@/components/_ui/Badge";
import { Button } from "@/components/_ui/Button";
import { Input } from "@/components/_ui/Input";

type ReposToolbarProps = {
  query: string;
  onQueryChange: (next: string) => void;
  /** Number of repos currently pinned as favorites. */
  selectedCount: number;
  /** Whether every visible repo is already selected (drives the toggle label). */
  allSelected: boolean;
  onToggleAll: () => void;
};

/**
 * Step 6 toolbar: a search field that filters the grid client-side, a
 * "{count} selected" badge (accent once anything is picked), and a "Select
 * all"/"Clear all" toggle over the currently-visible repos.
 */
export function ReposToolbar({
  query,
  onQueryChange,
  selectedCount,
  allSelected,
  onToggleAll,
}: ReposToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <Input
          size="sm"
          placeholder="Search repositories…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          leadingIcon={<Search size={14} aria-hidden="true" />}
          aria-label="Search repositories"
        />
      </div>
      <Badge variant={selectedCount > 0 ? "cyan" : "gray"} shape="pill">
        {selectedCount} selected
      </Badge>
      <Button intent="ghost" size="sm" onClick={onToggleAll}>
        {allSelected ? "Clear all" : "Select all"}
      </Button>
    </div>
  );
}
