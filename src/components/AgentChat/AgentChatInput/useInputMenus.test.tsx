import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDashboardStore } from '@/store/useDashboardStore';
import type { AgentFile } from '@/types/agent.types';
import type { SkillFile } from '@/types/dashboard.types';

import { InputMenu } from './InputMenu';
import { useInputMenus } from './useInputMenus';

function makeAgent(name: string): AgentFile {
  return {
    id: name,
    filePath: `/a/${name}.md`,
    relativePath: `${name}.md`,
    folder: '',
    frontmatter: { name, description: '' },
    body: '',
    status: 'created',
    subAgents: [],
    memoryFiles: [],
    annexFiles: [],
  };
}

function makeSkill(name: string): SkillFile {
  return {
    name,
    description: '',
    filePath: `/s/${name}`,
    scope: 'project',
    body: '',
    lineCount: 0,
    annexFiles: [],
  };
}

/** A minimal harness mirroring AgentChatInput's wiring: it feeds plain text to the
 *  hook and renders the real menu, exposing keyboard nav + click selection. */
function Harness({ onSelect }: { onSelect: (id: string) => void }) {
  const [text, setText] = useState('');
  const menus = useInputMenus(text);
  return (
    <div>
      <input aria-label="probe" value={text} onChange={(e) => setText(e.target.value)} />
      {menus.kind ? (
        <div>
          <button type="button" aria-label="down" onClick={() => menus.move(1)} />
          <button
            type="button"
            aria-label="enter"
            onClick={() => menus.activeId && onSelect(menus.activeId)}
          />
          <InputMenu groups={menus.groups} activeIndex={menus.activeIndex} onSelect={onSelect} />
        </div>
      ) : null}
    </div>
  );
}

beforeEach(() => {
  useDashboardStore.setState({
    agents: [makeAgent('code-reviewer'), makeAgent('committer'), makeAgent('planner')],
    skills: [makeSkill('compactor'), makeSkill('docs-writer')],
  });
});

describe('useInputMenus — mention menu', () => {
  it('typing @co shows matching agents and skills, grouped', () => {
    render(<Harness onSelect={() => {}} />);
    fireEvent.change(screen.getByLabelText('probe'), { target: { value: '@co' } });

    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /code-reviewer/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /committer/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /compactor/ })).toBeInTheDocument();
    // 'planner' / 'docs-writer' do not contain 'co'.
    expect(screen.queryByRole('option', { name: /planner/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /docs-writer/ })).not.toBeInTheDocument();
  });

  it('clicking an option selects its name', () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    fireEvent.change(screen.getByLabelText('probe'), { target: { value: '@co' } });
    fireEvent.mouseDown(screen.getByRole('option', { name: /committer/ }));
    expect(onSelect).toHaveBeenCalledWith('committer');
  });
});

describe('useInputMenus — slash menu keyboard nav', () => {
  it('opens for / and moves the active highlight on ArrowDown', () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    fireEvent.change(screen.getByLabelText('probe'), { target: { value: '/co' } });

    const first = screen.getAllByRole('option')[0];
    expect(first).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByLabelText('down'));
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByLabelText('enter'));
    // Enter selects the highlighted command (id is the `/cmd` token).
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatch(/^\//);
  });

  it('slash and mention are mutually exclusive', () => {
    render(<Harness onSelect={() => {}} />);
    fireEvent.change(screen.getByLabelText('probe'), { target: { value: '/co' } });
    // Slash menu has no group titles; mention groups (Agents/Skills) must be absent.
    expect(screen.queryByText('Agents')).not.toBeInTheDocument();
    expect(screen.queryByText('Skills')).not.toBeInTheDocument();
  });
});
