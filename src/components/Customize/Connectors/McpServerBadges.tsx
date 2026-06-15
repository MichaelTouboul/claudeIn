import { Badge, type BadgeVariant } from '@/components/_ui/Badge';
import type { McpServerEntry, McpTransport } from '@/lib/types';

import { SOURCE_PRESENTATION, TRANSPORT_PRESENTATION } from './mcpPresentation';

export type McpServerBadgesProps = {
  server: McpServerEntry;
};

// Transport→Badge-hue map (no fallback chain): every McpTransport, incl.
// `unknown`, has an explicit variant so the colored chip carries meaning.
const TRANSPORT_VARIANT: Record<McpTransport, BadgeVariant> = {
  stdio: 'cyan',
  http: 'green',
  sse: 'green',
  unknown: 'gray',
};

// Transport + provenance badges, rendered with the shared Badge primitive.
// Both labels come from the explicit behavior maps.
export function McpServerBadges({ server }: McpServerBadgesProps) {
  const transport = TRANSPORT_PRESENTATION[server.transport];
  const source = SOURCE_PRESENTATION[server.source];

  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge variant={TRANSPORT_VARIANT[server.transport]} data-testid="mcp-transport-badge">
        {transport.label}
      </Badge>
      <Badge variant="gray" className="font-sans" data-testid="mcp-source-badge">
        {source.label}
      </Badge>
    </span>
  );
}
