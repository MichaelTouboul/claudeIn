import { useEffect, useState } from 'react';

import { DetailStatus } from '@/components/_ui/DetailStatus';
import type { SkillFile } from '@/hooks/useProjects';
import { api } from '@/services/api';

import { SkillDetailContent } from './SkillDetailContent';

export type SkillDetailProps = {
  filePath: string;
};

type LoadState = 'loading' | 'loaded' | 'not-found';

/**
 * Fetches the full skill on-demand from its SKILL.md path (the list holds only
 * lightweight summaries) and renders the detail once loaded. Re-fetches when
 * `filePath` changes. Loading / not-found states are surfaced inline.
 */
export function SkillDetail({ filePath }: SkillDetailProps) {
  const [skill, setSkill] = useState<SkillFile | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setSkill(null);
    void api.getSkill(filePath).then((result) => {
      if (cancelled) return;
      if (result) {
        setSkill(result);
        setState('loaded');
      } else {
        setState('not-found');
      }
    });
    return () => { cancelled = true; };
  }, [filePath]);

  if (state === 'loading') return <DetailStatus message="Loading skill…" />;
  if (state === 'not-found' || !skill) return <DetailStatus message="Skill not found." />;

  return <SkillDetailContent skill={skill} />;
}
