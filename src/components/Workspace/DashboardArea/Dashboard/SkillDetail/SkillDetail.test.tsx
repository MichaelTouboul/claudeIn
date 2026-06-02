import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SkillFile } from '@/hooks/useProjects';

import { SkillDetail } from './SkillDetail';

// Isolate the fetching wrapper: stub the content child and the api.
vi.mock('./SkillDetailContent', () => ({
  SkillDetailContent: ({ skill }: { skill: SkillFile }) => <div>content:{skill.name}</div>,
}));

const { getSkill } = vi.hoisted(() => ({ getSkill: vi.fn<(filePath: string) => Promise<SkillFile | null>>() }));
vi.mock('@/services/api', () => ({ api: { getSkill } }));

function fullSkill(name: string): SkillFile {
  return {
    name, description: '', filePath: `/s/${name}/SKILL.md`, scope: 'project',
    body: '', lineCount: 0, annexFiles: [],
  };
}

beforeEach(() => getSkill.mockReset());

describe('SkillDetail on-demand fetch', () => {
  it('shows a loading state, then the content once loaded', async () => {
    let resolve!: (s: SkillFile | null) => void;
    getSkill.mockReturnValue(new Promise((r) => { resolve = r; }));

    render(<SkillDetail filePath="/s/compactor/SKILL.md" />);
    expect(screen.getByText('Loading skill…')).toBeInTheDocument();

    resolve(fullSkill('compactor'));
    await waitFor(() => expect(screen.getByText('content:compactor')).toBeInTheDocument());
    expect(getSkill).toHaveBeenCalledWith('/s/compactor/SKILL.md');
  });

  it('shows a not-found state when the fetch returns null', async () => {
    getSkill.mockResolvedValue(null);
    render(<SkillDetail filePath="/s/ghost/SKILL.md" />);
    await waitFor(() => expect(screen.getByText('Skill not found.')).toBeInTheDocument());
  });

  it('re-fetches when filePath changes', async () => {
    getSkill.mockImplementation((fp) =>
      Promise.resolve(fp?.includes('compactor') ? fullSkill('compactor') : fullSkill('docs-writer')));
    const { rerender } = render(<SkillDetail filePath="/s/compactor/SKILL.md" />);
    await waitFor(() => expect(screen.getByText('content:compactor')).toBeInTheDocument());

    rerender(<SkillDetail filePath="/s/docs-writer/SKILL.md" />);
    await waitFor(() => expect(screen.getByText('content:docs-writer')).toBeInTheDocument());
    expect(getSkill).toHaveBeenCalledWith('/s/compactor/SKILL.md');
    expect(getSkill).toHaveBeenCalledWith('/s/docs-writer/SKILL.md');
  });
});
