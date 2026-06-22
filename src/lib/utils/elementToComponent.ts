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

/** `src/components/_ui/` is the real convention marking a generic primitive. */
const UI_PRIMITIVE_PREFIX = 'src/components/_ui/';

/**
 * Walk UP from `el`, collecting the ordered render-tree ancestor chain of
 * `{ component, sourcePath }` (innermost → outermost). Consecutive annotated
 * elements that share the same `data-component` collapse to a single entry (one
 * component renders several nested DOM nodes). Returns `[]` when nothing is
 * annotated (production builds, or an un-instrumented subtree).
 */
export function elementToComponentChain(el: Element | null): ComponentSource[] {
  const chain: ComponentSource[] = [];
  let node: Element | null = el?.closest(COMPONENT_SELECTOR) ?? null;

  while (node) {
    const component = node.getAttribute('data-component');
    if (component) {
      // Prefer the source on the same element; otherwise the nearest ancestor's.
      const sourcePath = node.closest('[data-source]')?.getAttribute('data-source') ?? '';
      const last = chain[chain.length - 1];
      if (!last || last.component !== component) chain.push({ component, sourcePath });
    }
    node = node.parentElement?.closest(COMPONENT_SELECTOR) ?? null;
  }

  return chain;
}

/**
 * Maps a clicked element to the SINGLE nearest annotated component — the
 * innermost entry of {@link elementToComponentChain}. Kept for callers that only
 * want the best single guess.
 */
export function elementToComponent(el: Element | null): ComponentSource | null {
  return elementToComponentChain(el)[0] ?? null;
}

/**
 * Pick the chain index to default-select in the target picker: the first entry
 * whose `sourcePath` is NOT a `_ui/` primitive (those are generic low-level
 * Button/Flex/Stack, rarely what the user means). Falls back to 0 when every
 * entry is `_ui/` or the chain is empty.
 */
export function smartDefaultTargetIndex(chain: ComponentSource[]): number {
  const idx = chain.findIndex((c) => !c.sourcePath.startsWith(UI_PRIMITIVE_PREFIX));
  return idx === -1 ? 0 : idx;
}
