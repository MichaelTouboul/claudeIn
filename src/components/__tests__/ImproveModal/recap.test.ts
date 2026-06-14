import { describe, expect, it } from 'vitest';

import { buildImproveRequest } from '@/components/ImproveModal/recap';
import type { ChatMessage } from '@/components/ImproveModal/types';
import { ImproveType } from '@/lib/types';

const user = (text: string): ChatMessage => ({ id: text, role: 'user', text });
const assistant = (text: string): ChatMessage => ({ id: `a:${text}`, role: 'assistant', text });

describe('buildImproveRequest — recap → ImproveRequest mapping', () => {
  it('parses Title / Description / Acceptance bullets from the latest assistant recap', () => {
    const messages: ChatMessage[] = [
      user('the send button is hard to see'),
      assistant(
        [
          'Title: Make the send button more prominent',
          'Description: Increase contrast and size of the chat send button.',
          'Acceptance:',
          '- Send button uses the accent color',
          '- Button is at least 32px tall',
        ].join('\n'),
      ),
    ];

    const req = buildImproveRequest({
      type: ImproveType.Design,
      target: { component: 'AgentChatInput', sourcePath: 'src/x.tsx:1' },
      messages,
    });

    expect(req.type).toBe(ImproveType.Design);
    expect(req.component).toBe('AgentChatInput');
    expect(req.sourcePath).toBe('src/x.tsx:1');
    expect(req.title).toBe('Make the send button more prominent');
    expect(req.description).toContain('Increase contrast');
    expect(req.acceptance).toEqual([
      'Send button uses the accent color',
      'Button is at least 32px tall',
    ]);
    // transcript carries every turn
    expect(req.transcript).toHaveLength(2);
    expect(req.transcript?.[0]).toEqual({ role: 'user', text: 'the send button is hard to see' });
  });

  it('parses a markdown-bold EN recap (**Title:** / **Acceptance:**) with trailing prose', () => {
    const messages: ChatMessage[] = [
      user('the modal is too cramped'),
      assistant(
        [
          'Sure, here is what I propose:',
          '',
          '**Title:** Widen the Improve modal',
          '**Description:** Give the scoping modal more horizontal room so',
          'long messages wrap less.',
          '**Acceptance:**',
          '- Modal max-width grows to 720px',
          '- Content keeps a 24px padding',
          '',
          '---',
          'Does that work for you?',
        ].join('\n'),
      ),
    ];

    const req = buildImproveRequest({ type: ImproveType.Design, target: null, messages });

    expect(req.title).toBe('Widen the Improve modal');
    expect(req.description).toContain('more horizontal room');
    expect(req.acceptance).toEqual(['Modal max-width grows to 720px', 'Content keeps a 24px padding']);
    // description must NOT be the whole transcript when a recap exists
    expect(req.description).not.toContain('the modal is too cramped');
    expect(req.description).not.toContain('Does that work for you?');
  });

  it('parses a French markdown-bold recap (**Titre** : / **Acceptance** :)', () => {
    const messages: ChatMessage[] = [
      user('le bouton envoyer est trop discret'),
      assistant(
        [
          'Voici un récapitulatif :',
          '',
          '**Titre** : Rendre le bouton envoyer plus visible',
          '**Description** : Augmenter le contraste et la taille du bouton.',
          '**Acceptance** :',
          '• Le bouton utilise la couleur accent',
          '* Le bouton fait au moins 32px de haut',
          '',
          'Ça te convient ?',
        ].join('\n'),
      ),
    ];

    const req = buildImproveRequest({ type: ImproveType.Design, target: null, messages });

    expect(req.title).toBe('Rendre le bouton envoyer plus visible');
    expect(req.description).toContain('contraste');
    expect(req.acceptance).toEqual([
      'Le bouton utilise la couleur accent',
      'Le bouton fait au moins 32px de haut',
    ]);
    expect(req.description).not.toContain('Ça te convient ?');
  });

  it('prefers a fenced ```recap block and ignores surrounding prose', () => {
    const messages: ChatMessage[] = [
      user('add a keyboard shortcut to send'),
      assistant(
        [
          'Got it. Let me capture this:',
          '',
          '```recap',
          'TITLE: Add Cmd+Enter to send a message',
          'DESCRIPTION: Submit the chat input with Cmd+Enter (Ctrl+Enter on Windows).',
          'ACCEPTANCE:',
          '- Cmd+Enter sends the message',
          '- Enter alone inserts a newline',
          '```',
          '',
          'Let me know if I missed anything!',
        ].join('\n'),
      ),
    ];

    const req = buildImproveRequest({ type: ImproveType.Feature, target: null, messages });

    expect(req.title).toBe('Add Cmd+Enter to send a message');
    expect(req.description).toContain('Cmd+Enter');
    expect(req.acceptance).toEqual([
      'Cmd+Enter sends the message',
      'Enter alone inserts a newline',
    ]);
    expect(req.description).not.toContain('Got it.');
    expect(req.description).not.toContain('Let me know');
  });

  it('falls back to the first user message as title + transcript as description when no recap', () => {
    const messages: ChatMessage[] = [
      user('add dark mode toggle'),
      assistant('Where should the toggle live?'),
      user('in the header'),
    ];

    const req = buildImproveRequest({
      type: ImproveType.Feature,
      target: null,
      messages,
    });

    expect(req.title).toBe('add dark mode toggle');
    expect(req.description).toContain('add dark mode toggle');
    expect(req.description).toContain('in the header');
    expect(req.acceptance).toEqual([]);
    expect(req.component).toBeUndefined();
    expect(req.sourcePath).toBeUndefined();
  });

  it('omits component/sourcePath keys when the target is null', () => {
    const req = buildImproveRequest({
      type: ImproveType.Bug,
      target: null,
      messages: [user('it crashes')],
    });
    expect('component' in req).toBe(false);
    expect('sourcePath' in req).toBe(false);
  });

  it('truncates an overly long derived title to a single sensible line', () => {
    const long = 'x'.repeat(200);
    const req = buildImproveRequest({
      type: ImproveType.Copy,
      target: null,
      messages: [user(long)],
    });
    expect(req.title.length).toBeLessThanOrEqual(120);
  });
});
