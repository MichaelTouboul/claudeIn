import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { ToonTab } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/ToonTab/ToonTab';
import { AttachmentFormat, type JsonAttachment } from '@/lib/types';
import { type PanelTab, PanelTabKind, toonTabId } from '@/store/dashboard/usePanelStore';
import { useToonStore } from '@/store/useToonStore';

function makeAttachment(over: Partial<JsonAttachment> = {}): JsonAttachment {
  return {
    id: 'a1',
    composerId: 'c1',
    sourceJson: '[\n  { "id": 1 }\n]',
    toon: '[1]{id}:\n  1',
    format: AttachmentFormat.Toon,
    jsonTokens: 30,
    toonTokens: 8,
    ...over,
  };
}

function makeTab(attachmentId = 'a1'): PanelTab {
  return { id: toonTabId(attachmentId), kind: PanelTabKind.Toon, title: 'TOON', payload: { attachmentId } };
}

beforeEach(() => {
  useToonStore.setState({ attachments: {}, editingId: null });
});

describe('ToonTab', () => {
  it('renders the JSON, the TOON, and the honest saved-token delta', () => {
    useToonStore.getState().add(makeAttachment());
    render(<ToonTab tab={makeTab()} />);

    expect(screen.getByText(/≈30 JSON/)).toBeInTheDocument();
    expect(screen.getByText(/≈8 TOON/)).toBeInTheDocument();
    expect(screen.getByText(/22 tokens saved/)).toBeInTheDocument();
    expect((screen.getByLabelText('TOON output') as HTMLTextAreaElement).value).toContain('[1]{id}:');
  });

  it('toggles the send-format and writes it back to the store', () => {
    useToonStore.getState().add(makeAttachment());
    render(<ToonTab tab={makeTab()} />);

    fireEvent.click(screen.getByTitle('Send as JSON'));
    expect(useToonStore.getState().attachments.a1.format).toBe(AttachmentFormat.Json);
  });

  it('says JSON is kept when TOON does not save tokens', () => {
    useToonStore.getState().add(makeAttachment({ format: AttachmentFormat.Json, toonTokens: 40 }));
    render(<ToonTab tab={makeTab()} />);
    expect(screen.getByText(/no saving — JSON kept/)).toBeInTheDocument();
  });

  it('shows a graceful note when TOON encoding failed (no textarea)', () => {
    useToonStore.getState().add(makeAttachment({ toon: null, toonTokens: 0, format: AttachmentFormat.Json }));
    render(<ToonTab tab={makeTab()} />);
    expect(screen.getByText(/TOON encoding failed/)).toBeInTheDocument();
    expect(screen.queryByLabelText('TOON output')).not.toBeInTheDocument();
  });

  it('falls back gracefully when the attachment is gone', () => {
    render(<ToonTab tab={makeTab('missing')} />);
    expect(screen.getByText(/no longer available/)).toBeInTheDocument();
  });
});
