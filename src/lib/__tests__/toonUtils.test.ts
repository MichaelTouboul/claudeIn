import { describe, expect, it } from 'vitest';

import { AttachmentFormat } from '@/lib/types';
import {
  buildJsonAttachment,
  detectJson,
  encodeToon,
  estimateTokens,
  tokenDelta,
} from '@/lib/utils';

const tabular = JSON.stringify(
  Array.from({ length: 6 }, (_, i) => ({ id: i, name: `r${i}`, active: i % 2 === 0 })),
);

describe('detectJson', () => {
  it('rejects non-JSON text', () => {
    expect(detectJson('hello world')).toBeNull();
    expect(detectJson('')).toBeNull();
  });

  it('rejects JSON primitives (only objects/arrays are candidates)', () => {
    expect(detectJson('42')).toBeNull();
    expect(detectJson('"a string"')).toBeNull();
    expect(detectJson('true')).toBeNull();
  });

  it('rejects invalid JSON that merely starts like an object', () => {
    expect(detectJson('{not valid')).toBeNull();
  });

  it('marks a tiny single-line object as NOT substantial', () => {
    const d = detectJson('{"a":1}');
    expect(d).not.toBeNull();
    expect(d?.substantial).toBe(false);
  });

  it('marks a multiline object as substantial', () => {
    const d = detectJson('{\n  "a": 1,\n  "b": 2\n}');
    expect(d?.substantial).toBe(true);
  });

  it('marks a long (≥200 char) single-line array as substantial', () => {
    const d = detectJson(tabular);
    expect(d?.substantial).toBe(true);
  });
});

describe('encodeToon', () => {
  it('encodes a uniform array to compact tabular TOON', () => {
    const toon = encodeToon([{ id: 1, name: 'a' }, { id: 2, name: 'b' }]);
    expect(toon).toContain('id,name');
    expect(toon).toContain('1,a');
  });
});

describe('estimateTokens', () => {
  it('returns 0 for empty input', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('returns a positive count for real text', () => {
    expect(estimateTokens('the quick brown fox')).toBeGreaterThan(0);
  });
});

describe('tokenDelta', () => {
  it('reports a positive saving when the after-form is smaller', () => {
    const before = 'a '.repeat(100);
    const after = 'a';
    const d = tokenDelta(before, after);
    expect(d.before).toBeGreaterThan(d.after);
    expect(d.saved).toBeGreaterThan(0);
    expect(d.pct).toBeGreaterThan(0);
  });

  it('reports a non-positive saving when the after-form is larger', () => {
    const d = tokenDelta('a', 'a '.repeat(50));
    expect(d.saved).toBeLessThanOrEqual(0);
  });

  it('handles an empty before without dividing by zero', () => {
    expect(tokenDelta('', 'x').pct).toBe(0);
  });
});

describe('buildJsonAttachment', () => {
  it('returns null for non-substantial input', () => {
    expect(buildJsonAttachment('{"a":1}', 'c1')).toBeNull();
    expect(buildJsonAttachment('not json', 'c1')).toBeNull();
  });

  it('builds an attachment with both renderings and ≈ token counts', () => {
    const att = buildJsonAttachment(tabular, 'c1');
    expect(att).not.toBeNull();
    expect(att?.composerId).toBe('c1');
    expect(att?.toon).toBeTruthy();
    expect(att?.jsonTokens).toBeGreaterThan(0);
    expect(att?.toonTokens).toBeGreaterThan(0);
  });

  it('defaults the send-format to TOON when it is smaller (uniform data)', () => {
    const att = buildJsonAttachment(tabular, 'c1');
    expect(att?.toonTokens).toBeLessThan(att?.jsonTokens ?? 0);
    expect(att?.format).toBe(AttachmentFormat.Toon);
  });
});
