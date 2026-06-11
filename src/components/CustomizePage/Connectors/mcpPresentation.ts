import type { McpSource, McpTransport } from '@/types/mcp-mirror.types';

/**
 * Presentation behavior maps for the MCP view.
 *
 * Finite state (transport / provenance source) is modeled as an enum + a
 * value→behavior `Record`, NOT a fallback chain. Every `McpTransport` (incl.
 * `unknown`) and every `McpSource` has an explicit entry — there is no
 * missing-key `??` default doing the real work.
 */

export type TransportPresentation = {
  label: string;
  // Design-system CSS custom property name used to tint the badge.
  colorVar?: string;
};

export type SourcePresentation = {
  label: string;
};

export const TRANSPORT_PRESENTATION: Record<McpTransport, TransportPresentation> = {
  stdio: { label: 'stdio', colorVar: '--color-accent' },
  http: { label: 'http', colorVar: '--color-active' },
  sse: { label: 'sse', colorVar: '--color-active' },
  unknown: { label: 'unknown', colorVar: '--color-text-muted' },
};

export const SOURCE_PRESENTATION: Record<McpSource, SourcePresentation> = {
  'user-settings': { label: 'User settings' },
  'user-global': { label: 'User global' },
  'project-mcp-json': { label: 'Project .mcp.json' },
  'project-settings': { label: 'Project settings' },
};
