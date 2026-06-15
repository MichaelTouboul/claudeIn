import { Plus, Search } from "lucide-react";

import { Avatar } from "@/components/_ui/Avatar";
import { Button } from "@/components/_ui/Button";
import { IconButton } from "@/components/_ui/IconButton";
import { Input } from "@/components/_ui/Input";

type HomeTopbarProps = {
  /** Live search value filtering the favorite repos grid. */
  query: string;
  onQueryChange: (next: string) => void;
  /** Display name for the profile avatar (null → generic). */
  profileName: string | null;
  onNewSession: () => void;
  onOpenProfile: () => void;
};

/**
 * Home top bar: the ClaudeIn brand, a live project search, the primary
 * "New session" action, and a profile avatar button that opens the drawer.
 */
export function HomeTopbar({
  query,
  onQueryChange,
  profileName,
  onNewSession,
  onOpenProfile,
}: HomeTopbarProps) {
  return (
    <header
      className="flex h-[var(--header-height)] items-center gap-3 border-b border-border px-5"
      style={{ background: "var(--color-surface-1)" }}
    >
      <span className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-fg">
        <svg
          width="22"
          height="22"
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden="true"
          style={{ color: "var(--color-accent)" }}
        >
          <path
            d="M9 8.5 L17 16 L9 23.5"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M20.5 23.5 L25 23.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        ClaudeIn
      </span>
      <div className="flex-1" />
      <div className="w-60">
        <Input
          size="sm"
          aria-label="Search projects"
          placeholder="Search projects…"
          leadingIcon={<Search size={14} aria-hidden="true" />}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>
      <Button intent="primary" size="md" leftIcon={<Plus size={15} aria-hidden="true" />} onClick={onNewSession}>
        New session
      </Button>
      <IconButton aria-label="Open profile" onClick={onOpenProfile}>
        <Avatar name={profileName ?? "You"} hue="blue" size="sm" />
      </IconButton>
    </header>
  );
}
