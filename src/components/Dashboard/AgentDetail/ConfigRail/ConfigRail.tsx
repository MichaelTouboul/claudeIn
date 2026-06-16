import { Brain } from 'lucide-react';

import type { AgentFile, AgentFrontmatter } from '@/lib/types';

import { DetailCard } from '../DetailCard/DetailCard';
import { MemoryManager } from '../MemoryManager/MemoryManager';
import { ConfigCard } from './ConfigCard/ConfigCard';
import { FilesCard } from './FilesCard/FilesCard';
import { ToolsCard } from './ToolsCard/ToolsCard';

export type ConfigRailProps = {
  agent: AgentFile;
  editing: boolean;
  draft: Partial<AgentFrontmatter>;
  onChange: (key: keyof AgentFrontmatter & string, value: unknown) => void;
};

/**
 * The right rail of the agent-config page: Configuration rows, the Tools card,
 * the annex Files card, and — when the agent declares `memory` — the persistent
 * MemoryManager (folded in, kept fully reachable).
 */
export function ConfigRail({ agent, editing, draft, onChange }: ConfigRailProps) {
  const { frontmatter } = agent;
  const hasFiles = agent.annexFiles.length > 0;
  const hasMemory = Boolean(frontmatter.memory);

  return (
    <div className="flex flex-col gap-4">
      <ConfigCard frontmatter={frontmatter} editing={editing} draft={draft} onChange={onChange} />
      <ToolsCard frontmatter={frontmatter} />
      {hasFiles ? <FilesCard files={agent.annexFiles} /> : null}
      {hasMemory ? (
        <DetailCard icon={<Brain size={15} />} title="Memory">
          <MemoryManager agent={agent} />
        </DetailCard>
      ) : null}
    </div>
  );
}
