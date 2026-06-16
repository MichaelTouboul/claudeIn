import { Settings } from "lucide-react";

import { Avatar } from "@/components/_ui/Avatar";
import { Badge } from "@/components/_ui/Badge";
import { Button } from "@/components/_ui/Button";
import type { UserProfile } from "@/lib/types";

import { ProfileStatStrip } from "./ProfileStatStrip";

/** Collapse a `.../.claude` user path to the friendly `~/.claude` chip. */
function claudePathChip(path: string | null): string {
  if (path === null) return "~/.claude";
  const segments = path.split(/[\\/]/).filter(Boolean);
  const tail = segments[segments.length - 1];
  return tail === ".claude" ? "~/.claude" : path;
}

type ProfileIdentityCardProps = {
  profile: UserProfile;
  /** Switch the step into the inline editor. */
  onEdit: () => void;
};

/**
 * Identity + setup card (Step 4 hero): avatar, name, the `~/.claude` mono chip, a
 * "personal" scope badge, and an Edit affordance, with the capability stat strip
 * inset beneath it.
 */
export function ProfileIdentityCard({ profile, onEdit }: ProfileIdentityCardProps) {
  const name = profile.name ?? "Unnamed user";
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-2">
      <div className="flex items-center gap-3.5 px-5 py-4">
        <Avatar name={name} hue="blue" size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-semibold tracking-[-0.01em] text-fg">{name}</div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-xs text-fg-subtle" style={{ fontFamily: "var(--font-mono)" }}>
              {claudePathChip(profile.claudeUserPath)}
            </span>
            <Badge variant="gray" shape="pill">
              personal
            </Badge>
          </div>
        </div>
        <Button
          intent="outline"
          size="sm"
          leftIcon={<Settings size={14} aria-hidden="true" />}
          onClick={onEdit}
        >
          Edit
        </Button>
      </div>
      <ProfileStatStrip capabilities={profile.capabilities} />
    </div>
  );
}
