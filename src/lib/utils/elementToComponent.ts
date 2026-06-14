/**
 * Maps a clicked DOM element back to its React component + source file using the
 * `data-component` / `data-source` attributes injected at dev build time by the
 * `build/babel-plugin-component-source.cjs` Babel plugin.
 *
 * Pure and DOM-only: walks up from `el` to the nearest annotated ancestor.
 * Returns `null` when nothing is annotated (production builds, or an
 * un-instrumented subtree).
 */

import type { ComponentSource } from '@/lib/types';

const COMPONENT_SELECTOR = '[data-component]';

export function elementToComponent(el: Element | null): ComponentSource | null {
  if (!el) return null;

  const annotated = el.closest(COMPONENT_SELECTOR);
  if (!annotated) return null;

  const component = annotated.getAttribute('data-component');
  if (!component) return null;

  // Prefer the source on the same element; otherwise the nearest ancestor's.
  const withSource = annotated.closest('[data-source]');
  const sourcePath = withSource?.getAttribute('data-source') ?? '';

  return { component, sourcePath };
}
