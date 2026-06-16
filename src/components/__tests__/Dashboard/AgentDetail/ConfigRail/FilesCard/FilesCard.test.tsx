import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FilesCard } from '@/components/Dashboard/AgentDetail/ConfigRail/FilesCard/FilesCard';
import type { AnnexFile } from '@/lib/types';

const { openPath } = vi.hoisted(() => ({
  openPath: vi.fn<(path: string) => Promise<string>>(),
}));
vi.mock('@/services/api', () => ({ api: { openPath } }));

function file(name: string, path: string): AnnexFile {
  return { name, path, content: '', isEnv: false };
}

beforeEach(() => {
  openPath.mockReset();
  openPath.mockResolvedValue('');
});

describe('FilesCard', () => {
  it('renders each file as an accessible button', () => {
    render(<FilesCard files={[file('README.md', '/a/README.md')]} />);
    const row = screen.getByRole('button', { name: /README\.md/ });
    expect(row).toBeInTheDocument();
  });

  it('opens the file with its path on click', async () => {
    render(<FilesCard files={[file('notes.md', '/a/notes.md')]} />);
    fireEvent.click(screen.getByRole('button', { name: /notes\.md/ }));
    await waitFor(() => expect(openPath).toHaveBeenCalledWith('/a/notes.md'));
  });

  it('activates on Enter / Space via the button element', async () => {
    render(<FilesCard files={[file('a.md', '/a/a.md')]} />);
    const row = screen.getByRole('button', { name: /a\.md/ });
    // a native <button> fires click on Enter/Space; assert the element type.
    expect(row.tagName).toBe('BUTTON');
    fireEvent.click(row);
    await waitFor(() => expect(openPath).toHaveBeenCalledWith('/a/a.md'));
  });

  it('surfaces a non-empty error string without crashing', async () => {
    openPath.mockResolvedValue('Failed to open path');
    render(<FilesCard files={[file('gone.md', '/missing/gone.md')]} />);
    fireEvent.click(screen.getByRole('button', { name: /gone\.md/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/failed to open/i));
    // UI still intact: the file row is still rendered.
    expect(screen.getByRole('button', { name: /gone\.md/ })).toBeInTheDocument();
  });

  it('surfaces a thrown/rejected error without crashing', async () => {
    openPath.mockRejectedValue(new Error('boom'));
    render(<FilesCard files={[file('bad.md', '/x/bad.md')]} />);
    fireEvent.click(screen.getByRole('button', { name: /bad\.md/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /bad\.md/ })).toBeInTheDocument();
  });
});
