import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SessionMessageRow } from '@/components/Workspace/DashboardArea/Dashboard/SessionViewer/SessionMessageRow/SessionMessageRow';
import type { SessionMessage } from '@/hooks/useSessions';

function userMsg(content: string): SessionMessage {
  return { role: 'user', content, timestamp: '2026-06-11T10:00:00.000Z', uuid: 'u1' };
}

describe('SessionMessageRow — harness noise', () => {
  it('renders nothing for a user turn that is purely a <task-notification> block', () => {
    const content =
      '<task-notification>\n' +
      '<task-id>bj40in9jm</task-id>\n' +
      '<status>killed</status>\n' +
      '<summary>Background command "x" was stopped</summary>\n' +
      '</task-notification>';
    const { container } = render(<SessionMessageRow msg={userMsg(content)} />);
    expect(container.textContent).toBe('');
    expect(container.querySelector('pre')).toBeNull();
  });

  it('renders nothing for a user turn that is purely a <system-reminder> block', () => {
    const { container } = render(
      <SessionMessageRow msg={userMsg('<system-reminder>injected</system-reminder>')} />
    );
    expect(container.textContent).toBe('');
  });

  it('keeps only the genuine prose when a <system-reminder> is appended', () => {
    const content =
      'Refactor the parser.\n<system-reminder>plumbing the user never typed</system-reminder>';
    const { container } = render(<SessionMessageRow msg={userMsg(content)} />);
    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toBe('Refactor the parser.');
    expect(container.textContent).not.toContain('system-reminder');
    expect(container.textContent).not.toContain('plumbing the user never typed');
  });

  it('renders normal user prose verbatim', () => {
    const { container } = render(<SessionMessageRow msg={userMsg('hello there')} />);
    expect(container.querySelector('pre')?.textContent).toBe('hello there');
  });
});
