import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { JsonChip } from '@/components/Dashboard/AgentChat/AgentChatInput/JsonChip/JsonChip';
import { AttachmentFormat, type JsonAttachment } from '@/lib/types';
import { PanelTabKind, usePanelStore } from '@/store/dashboard/usePanelStore';
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

beforeEach(() => {
  useToonStore.setState({ attachments: {}, editingId: null });
  usePanelStore.setState({ isOpen: false, current: null });
});

describe('JsonChip', () => {
  it('shows the TOON token saving when TOON is the chosen format', () => {
    useToonStore.getState().add(makeAttachment());
    render(<JsonChip attachment={makeAttachment()} />);
    expect(screen.getByText(/TOON · ≈22 tokens saved/)).toBeInTheDocument();
  });

  it('shows a neutral JSON note when JSON is kept (no saving)', () => {
    const att = makeAttachment({ format: AttachmentFormat.Json });
    useToonStore.getState().add(att);
    render(<JsonChip attachment={att} />);
    expect(screen.getByText(/JSON · ≈30 tokens/)).toBeInTheDocument();
  });

  it('delete badge removes the attachment from the store', () => {
    useToonStore.getState().add(makeAttachment());
    render(<JsonChip attachment={makeAttachment()} />);
    fireEvent.click(screen.getByLabelText('Remove attachment'));
    expect(useToonStore.getState().attachments.a1).toBeUndefined();
  });

  it('edit badge opens the TOON panel tab and sets editing', () => {
    useToonStore.getState().add(makeAttachment());
    render(<JsonChip attachment={makeAttachment()} />);
    fireEvent.click(screen.getByLabelText('Edit conversion'));

    expect(useToonStore.getState().editingId).toBe('a1');
    const current = usePanelStore.getState().current;
    expect(usePanelStore.getState().isOpen).toBe(true);
    expect(current?.kind).toBe(PanelTabKind.Toon);
    expect(current?.kind === PanelTabKind.Toon ? current.payload.attachmentId : null).toBe('a1');
  });
});
