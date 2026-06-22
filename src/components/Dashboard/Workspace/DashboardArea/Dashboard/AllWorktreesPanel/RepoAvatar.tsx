import { useState } from 'react';

import type { AvatarHue } from '@/components/_ui/Avatar/Avatar';

import { RepoChip } from './RepoChip';

export type RepoAvatarProps = {
  /** Repo logo as a base64 `data:` URL; falls back to the hued chip when absent. */
  logoDataUrl?: string | null;
  /** Display name — drives the image alt text. */
  name: string;
  /** Identity hue for the fallback folder chip. */
  hue: AvatarHue;
  /** Square edge length in px (matches the `RepoChip` size scale). */
  size?: number;
  /** Inner folder icon size for the chip fallback. */
  icon?: number;
};

/**
 * A repository identity badge: renders the repo's detected `logoDataUrl` as a
 * square image when one exists, otherwise the hued folder `RepoChip`. A broken or
 * empty data-url gracefully degrades to the chip (via `onError`). This is the
 * "repo avatar: logo-or-chip" treatment shared with the Home page repo cards —
 * it carries domain knowledge (the repo folder chip), so it lives beside
 * `RepoChip` rather than in `_ui/`.
 */
export function RepoAvatar({ logoDataUrl, name, hue, size = 26, icon = 14 }: RepoAvatarProps) {
  const [broken, setBroken] = useState(false);
  const showLogo = logoDataUrl !== null && logoDataUrl !== undefined && !broken;

  if (!showLogo) return <RepoChip hue={hue} size={size} icon={icon} />;

  return (
    <img
      src={logoDataUrl}
      alt={name}
      onError={() => setBroken(true)}
      className="shrink-0 rounded-sm object-cover"
      style={{
        width: size,
        height: size,
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface-3)',
      }}
    />
  );
}
