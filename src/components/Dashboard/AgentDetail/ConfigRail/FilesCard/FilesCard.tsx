import { Boxes, ChevronRight, FileText } from 'lucide-react';
import { useState } from 'react';

import type { AnnexFile } from '@/lib/types';
import { api } from '@/services/api';

import { DetailCard } from '../../DetailCard/DetailCard';

export type FilesCardProps = {
  files: AnnexFile[];
};

/** The "Files" card — the agent's annex files; click a row to open it in the OS default app. */
export function FilesCard({ files }: FilesCardProps) {
  const [error, setError] = useState<string | null>(null);

  async function openFile(file: AnnexFile) {
    setError(null);
    try {
      // shell.openPath returns '' on success, or a non-empty error message.
      const message = await api.openPath(file.path);
      if (message) setError(`Couldn't open ${file.name}: ${message}`);
    } catch {
      setError(`Couldn't open ${file.name}.`);
    }
  }

  return (
    <DetailCard icon={<Boxes size={15} />} title="Files" flush>
      <div className="py-2">
        {files.map((f) => (
          <button
            key={f.path}
            type="button"
            onClick={() => void openFile(f)}
            title={`Open ${f.name}`}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
          >
            <FileText size={15} className="shrink-0 text-fg-subtle" />
            <span className="flex-1 truncate font-mono text-[12.5px] text-fg-muted">{f.name}</span>
            <ChevronRight size={14} className="shrink-0 text-fg-subtle" />
          </button>
        ))}
        {error ? (
          <div role="alert" className="px-2.5 pt-1.5 text-[12px] text-danger">
            {error}
          </div>
        ) : null}
      </div>
    </DetailCard>
  );
}
