import type { AvatarHue } from "@/components/_ui/Avatar";

const HUES: AvatarHue[] = ["blue", "green", "purple", "orange", "cyan", "pink", "yellow", "red"];

/** Deterministic identity hue for a repo, derived from its path (stable across renders). */
export function repoHue(path: string): AvatarHue {
  let sum = 0;
  for (let i = 0; i < path.length; i += 1) sum = (sum + path.charCodeAt(i)) % HUES.length;
  return HUES[sum];
}
