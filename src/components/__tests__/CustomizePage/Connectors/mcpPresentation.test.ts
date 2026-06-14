import { describe, expect, it } from 'vitest';

import { SOURCE_PRESENTATION, TRANSPORT_PRESENTATION } from '@/components/CustomizePage/Connectors/mcpPresentation';
import type { McpSource, McpTransport } from '@/types/mcp-mirror.types';

const ALL_TRANSPORTS: McpTransport[] = ['stdio', 'http', 'sse', 'unknown'];
const ALL_SOURCES: McpSource[] = ['user-settings', 'user-global', 'project-mcp-json', 'project-settings'];

describe('mcpPresentation behavior maps', () => {
  it('has an explicit TRANSPORT_PRESENTATION entry with a label for every McpTransport (incl. unknown)', () => {
    for (const transport of ALL_TRANSPORTS) {
      const entry = TRANSPORT_PRESENTATION[transport];
      expect(entry, `missing transport entry: ${transport}`).toBeDefined();
      expect(typeof entry.label).toBe('string');
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });

  it('has an explicit SOURCE_PRESENTATION entry with a label for every McpSource', () => {
    for (const source of ALL_SOURCES) {
      const entry = SOURCE_PRESENTATION[source];
      expect(entry, `missing source entry: ${source}`).toBeDefined();
      expect(typeof entry.label).toBe('string');
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });

  it('exposes exactly the known transport keys (no extra, no missing)', () => {
    expect(Object.keys(TRANSPORT_PRESENTATION).sort()).toEqual([...ALL_TRANSPORTS].sort());
  });

  it('exposes exactly the known source keys (no extra, no missing)', () => {
    expect(Object.keys(SOURCE_PRESENTATION).sort()).toEqual([...ALL_SOURCES].sort());
  });
});
