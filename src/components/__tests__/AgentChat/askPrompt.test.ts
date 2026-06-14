import { describe, expect, it } from 'vitest';

import { CAM_ASK_LANG, isValidAskJson, parseAskPrompt } from '@/components/AgentChat/askPrompt';

function fence(body: string): string {
  return '```cam-ask\n' + body + '\n```';
}

describe('CAM_ASK_LANG', () => {
  it('is the reserved language string the registry depends on', () => {
    expect(CAM_ASK_LANG).toBe('cam-ask');
  });
});

describe('parseAskPrompt', () => {
  it('extracts a valid choice prompt', () => {
    const prompt = parseAskPrompt(
      fence(
        '{"type":"choice","question":"Which approach?","options":[' +
          '{"label":"Full refactor","value":"a","variant":"accept"},' +
          '{"label":"Minimal patch","value":"b"}]}'
      )
    );
    expect(prompt).toEqual({
      type: 'choice',
      question: 'Which approach?',
      options: [
        { label: 'Full refactor', value: 'a', variant: 'accept' },
        { label: 'Minimal patch', value: 'b' },
      ],
    });
  });

  it('extracts a valid text prompt with placeholder', () => {
    const prompt = parseAskPrompt(
      fence('{"type":"text","question":"What name?","placeholder":"e.g. foo"}')
    );
    expect(prompt).toEqual({ type: 'text', question: 'What name?', placeholder: 'e.g. foo' });
  });

  it('extracts a valid text prompt without placeholder', () => {
    const prompt = parseAskPrompt(fence('{"type":"text","question":"What name?"}'));
    expect(prompt).toEqual({ type: 'text', question: 'What name?' });
  });

  it('returns null for malformed JSON inside a cam-ask fence', () => {
    expect(parseAskPrompt(fence('{ not json'))).toBeNull();
  });

  it('returns null for a non-cam-ask code block', () => {
    expect(parseAskPrompt('```json\n{"type":"text","question":"Q"}\n```')).toBeNull();
  });

  it('extracts the prompt when surrounded by prose', () => {
    const content =
      'Here is some reasoning before.\n\n' +
      fence('{"type":"text","question":"Proceed?"}') +
      '\n\nAnd a trailing line.';
    expect(parseAskPrompt(content)).toEqual({ type: 'text', question: 'Proceed?' });
  });

  it('uses the last cam-ask block when multiple are present', () => {
    const content =
      fence('{"type":"text","question":"first"}') +
      '\n\n' +
      fence('{"type":"text","question":"second"}');
    expect(parseAskPrompt(content)).toEqual({ type: 'text', question: 'second' });
  });

  it('returns null for a choice with empty options', () => {
    expect(parseAskPrompt(fence('{"type":"choice","question":"Q","options":[]}'))).toBeNull();
  });

  it('returns null for a choice with an invalid option shape', () => {
    expect(
      parseAskPrompt(fence('{"type":"choice","question":"Q","options":[{"label":"A"}]}'))
    ).toBeNull();
  });

  it('returns null for an option with an unknown variant', () => {
    expect(
      parseAskPrompt(
        fence('{"type":"choice","question":"Q","options":[{"label":"A","value":"a","variant":"weird"}]}')
      )
    ).toBeNull();
  });

  it('returns null for an unknown prompt type', () => {
    expect(parseAskPrompt(fence('{"type":"multiselect","question":"Q"}'))).toBeNull();
  });

  it('returns null for a choice with an empty question', () => {
    expect(
      parseAskPrompt(fence('{"type":"choice","question":"","options":[{"label":"A","value":"a"}]}'))
    ).toBeNull();
  });

  it('returns null when no cam-ask block is present', () => {
    expect(parseAskPrompt('just some prose, no fences here')).toBeNull();
  });
});

describe('isValidAskJson', () => {
  it('returns true for a valid choice body', () => {
    expect(
      isValidAskJson('{"type":"choice","question":"Q","options":[{"label":"A","value":"a"}]}')
    ).toBe(true);
  });

  it('returns true for a valid text body', () => {
    expect(isValidAskJson('{"type":"text","question":"Q"}')).toBe(true);
  });

  it('returns false for malformed JSON', () => {
    expect(isValidAskJson('{ not json')).toBe(false);
  });

  it('returns false for a wrong shape', () => {
    expect(isValidAskJson('{"type":"choice","question":"Q","options":[]}')).toBe(false);
  });
});
