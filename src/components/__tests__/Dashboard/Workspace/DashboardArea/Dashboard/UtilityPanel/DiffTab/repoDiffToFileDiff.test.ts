import { describe, expect, it } from 'vitest';

import { repoFileToFileDiff } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/DiffTab/repoDiffToFileDiff';
import { FileStatus, GitLineKind } from '@/lib/types';

describe('repoFileToFileDiff', () => {
  it('flattens hunks into FileDiff lines with stable ids', () => {
    const fd = repoFileToFileDiff({
      path: 'a.ts',
      status: FileStatus.Modified,
      additions: 1,
      deletions: 0,
      binary: false,
      hunks: [
        {
          header: '@@ -1 +1,2 @@',
          lines: [
            { kind: GitLineKind.Hunk, text: '@@ -1 +1,2 @@', oldLine: null, newLine: null },
            { kind: GitLineKind.Add, text: 'x', oldLine: null, newLine: 2 },
          ],
        },
      ],
    });
    expect(fd.filePath).toBe('a.ts');
    expect(fd.lines).toHaveLength(2);
    expect(new Set(fd.lines.map((l) => l.id)).size).toBe(2); // unique ids
    expect(fd.lines[1].kind).toBe(GitLineKind.Add);
    expect(fd.lines[1].newNo).toBe(2);
  });
});
