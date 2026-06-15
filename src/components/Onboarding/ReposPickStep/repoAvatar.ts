import type { BadgeVariant } from "@/components/_ui/Badge";

/** Palette used for the fallback avatar, in a fixed order for deterministic mapping. */
const AVATAR_VARIANTS: readonly BadgeVariant[] = [
  "blue",
  "green",
  "yellow",
  "orange",
  "cyan",
  "purple",
  "pink",
  "red",
];

/** Stable, case-insensitive hash of a string (FNV-1a, masked to 31 bits). */
function hash(value: string): number {
  let h = 0x811c9dc5;
  const lower = value.toLowerCase();
  for (let i = 0; i < lower.length; i += 1) {
    h ^= lower.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 1;
}

/** A Badge color variant derived deterministically from the repo name. */
export function avatarVariant(name: string): BadgeVariant {
  return AVATAR_VARIANTS[hash(name) % AVATAR_VARIANTS.length];
}

/** The single uppercase letter shown in the fallback avatar. */
export function avatarLetter(name: string): string {
  const first = name.trim().charAt(0);
  return first === "" ? "?" : first.toUpperCase();
}
