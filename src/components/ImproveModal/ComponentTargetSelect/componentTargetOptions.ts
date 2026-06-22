import type { ComponentSource, ImproveContextTarget } from '@/lib/types';
import { smartDefaultTargetIndex } from '@/lib/utils';

/**
 * The target picker's selection is one of three kinds — a chain entry, the
 * free-text escape hatch, or "none". An `as const` map per kind (not a fallback
 * chain) drives both the option value encoding and how a selection resolves to
 * the submitted `{ component, sourcePath }`.
 */
export const TargetKind = {
  Chain: 'chain',
  FreeText: 'free',
  None: 'none',
} as const;
export type TargetKind = (typeof TargetKind)[keyof typeof TargetKind];

/** Stable `<option>` value for the free-text / none entries. */
export const FREE_TEXT_VALUE = '__free__';
export const NONE_VALUE = '__none__';

/** One selectable component from the resolved ancestor chain. */
export interface ChainOption {
  /** Index into the original chain (used as the stable option value/key). */
  index: number;
  component: string;
  sourcePath: string;
}

/** Build the chain options for the picker from a captured target. */
export function chainOptions(target: ImproveContextTarget | null): ChainOption[] {
  const chain = chainFromTarget(target);
  return chain.map((c, index) => ({ index, component: c.component, sourcePath: c.sourcePath }));
}

/**
 * The chain to offer. Prefer the explicit `chain`; otherwise synthesize a
 * single-entry chain from the legacy `{ component, sourcePath }` so a target
 * captured before chains existed still shows one option.
 */
function chainFromTarget(target: ImproveContextTarget | null): ComponentSource[] {
  if (target?.chain && target.chain.length > 0) return target.chain;
  if (target?.component) return [{ component: target.component, sourcePath: target.sourcePath ?? '' }];
  return [];
}

/** The `<option>` value to default-select: smart chain index, else "none". */
export function defaultSelectValue(target: ImproveContextTarget | null): string {
  const options = chainOptions(target);
  if (options.length === 0) return NONE_VALUE;
  return String(smartDefaultTargetIndex(chainFromTarget(target)));
}

/**
 * Resolve the picker selection to the submitted target fields. `chain` → that
 * entry; `free` → the typed name (no path); `none` → empty (the user describes
 * it). Never throws; an out-of-range index degrades to none.
 */
export function resolveTarget(
  target: ImproveContextTarget | null,
  selectValue: string,
  freeText: string,
): Pick<ImproveContextTarget, 'component' | 'sourcePath'> {
  if (selectValue === NONE_VALUE) return {};
  if (selectValue === FREE_TEXT_VALUE) {
    const name = freeText.trim();
    return name ? { component: name } : {};
  }
  const entry = chainOptions(target).find((o) => String(o.index) === selectValue);
  if (!entry) return {};
  return { component: entry.component, sourcePath: entry.sourcePath };
}
