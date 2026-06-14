import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InputMenu } from '@/components/AgentChat/AgentChatInput/InputMenu';
import { useInputMenus } from '@/components/AgentChat/AgentChatInput/useInputMenus';
import { useDashboardStore } from '@/store/useDashboardStore';
import type { AgentSummary } from '@/types/agents-mirror.types';
import type { SkillSummary } from '@/types/skills-mirror.types';

function makeAgent(name: string): AgentSummary {
  return {
    id: name,
    scope: 'project',
    filePath: `/a/${name}.md`,
    relativePath: `${name}.md`,
    folder: '',
    frontmatter: { name, description: '' },
    subAgents: [],
    shadowed: false,
  };
}

function makeSkill(name: string): SkillSummary {
  return {
    name,
    description: '',
    scope: 'project',
    filePath: `/s/${name}`,
    lineCount: 0,
    shadowed: false,
  };
}

/** A minimal harness mirroring AgentChatInput's wiring: it feeds plain text to the
 *  hook and renders the real menu, exposing keyboard nav + click selection. */
function Harness({ onSelect, modelPickerOpen = false }: { onSelect: (id: string) => void; modelPickerOpen?: boolean }) {
  const [text, setText] = useState('');
  const menus = useInputMenus(text, modelPickerOpen);
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
    // `/c` matches at least two commands (/clear, /compact) in the honest v1 menu,
    // so ArrowDown moves the highlight to a distinct second option.
    fireEvent.change(screen.getByLabelText('probe'), { target: { value: '/c' } });

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

describe('useInputMenus — model picker submenu', () => {
  it('lists the models as options when the picker is open (no text needed)', () => {
    render(<Harness onSelect={() => {}} modelPickerOpen />);
    expect(screen.getByRole('option', { name: /Opus 4.8/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Sonnet 4.6/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Haiku 4.5/ })).toBeInTheDocument();
  });

  it('selecting a model returns its id', () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} modelPickerOpen />);
    fireEvent.mouseDown(screen.getByRole('option', { name: /Opus 4.8/ }));
    expect(onSelect).toHaveBeenCalledWith('claude-opus-4-8');
  });

  it('reports kind "model" so the caller can route the selection', () => {
    function ProbeKind() {
      const menus = useInputMenus('', true);
      return <span data-testid="kind">{menus.kind}</span>;
    }
    render(<ProbeKind />);
    expect(screen.getByTestId('kind')).toHaveTextContent('model');
  });

  it('the model picker takes precedence over a slash query while open', () => {
    render(<Harness onSelect={() => {}} modelPickerOpen />);
    // Even with a slash token typed, an open picker shows model options.
    fireEvent.change(screen.getByLabelText('probe'), { target: { value: '/mo' } });
    expect(screen.getByRole('option', { name: /Opus 4.8/ })).toBeInTheDocument();
  });
});
