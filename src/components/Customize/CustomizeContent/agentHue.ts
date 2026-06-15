import type { AvatarHue } from "@/components/_ui/Avatar/Avatar";

// Stable, evenly-spread identity hues for sub-agent avatars. A name hashes to a
// fixed slot so the same agent always gets the same colour across renders.
const HUES: AvatarHue[] = ["green", "blue", "purple", "orange", "cyan", "pink"];

export function agentHue(name: string): AvatarHue {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return HUES[hash % HUES.length];
}
