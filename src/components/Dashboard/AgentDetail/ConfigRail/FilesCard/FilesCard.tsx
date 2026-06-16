import { Boxes, ChevronRight, FileText } from 'lucide-react';

import type { AnnexFile } from '@/lib/types';

import { DetailCard } from '../../DetailCard/DetailCard';

export type FilesCardProps = {
  files: AnnexFile[];
};

/** The "Files" card — the agent's annex files (read-only list). */
export function FilesCard({ files }: FilesCardProps) {
  return (
    <DetailCard icon={<Boxes size={15} />} title="Files" flush>
      <div className="py-2">
        {files.map((f) => (
          <div
            key={f.path}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-surface-2"
          >
            <FileText size={15} className="shrink-0 text-fg-subtle" />
            <span className="flex-1 truncate font-mono text-[12.5px] text-fg-muted">{f.name}</span>
            <ChevronRight size={14} className="shrink-0 text-fg-subtle" />
          </div>
        ))}
      </div>
    </DetailCard>
  );
}
