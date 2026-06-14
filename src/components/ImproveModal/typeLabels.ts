import { ImproveType } from '@/lib/types';

/** Human label per request type — drives the dropdown options (no fallback chains). */
export const IMPROVE_TYPE_LABEL: Record<ImproveType, string> = {
  [ImproveType.Feature]: 'Feature',
  [ImproveType.Bug]: 'Bug',
  [ImproveType.Design]: 'Design',
  [ImproveType.Performance]: 'Performance',
  [ImproveType.Copy]: 'Copy',
};

/** Ordered option list for the <select>, derived from the label map. */
export const IMPROVE_TYPE_OPTIONS = Object.entries(IMPROVE_TYPE_LABEL).map(
  ([value, label]) => ({ value: value as ImproveType, label }),
);
