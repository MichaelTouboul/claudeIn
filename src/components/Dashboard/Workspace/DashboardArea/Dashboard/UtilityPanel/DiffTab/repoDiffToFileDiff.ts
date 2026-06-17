import type { FileDiff } from '@/components/Dashboard/ResponseBody/blocks/DiffBlock/diff.types';
import type { RepoFileDiff } from '@/lib/types';

/**
 * Flatten a git {@link RepoFileDiff}'s hunks into the DiffBlock {@link FileDiff}
 * model. `GitLineKind` values are the SAME strings as the renderer's `LineKind`
 * (incl. `hunk`), so each line's `kind` passes straight through — no translation.
 * Ids are `${hunkIndex}:${lineIndex}` so they stay stable and unique across hunks.
 */
export function repoFileToFileDiff(file: RepoFileDiff): FileDiff {
  const lines = file.hunks.flatMap((h, hi) =>
    h.lines.map((l, li) => ({
      id: `${hi}:${li}`,
      kind: l.kind,
      oldNo: l.oldLine,
      newNo: l.newLine,
      text: l.text,
    })),
  );
  return { filePath: file.path, lines };
}
