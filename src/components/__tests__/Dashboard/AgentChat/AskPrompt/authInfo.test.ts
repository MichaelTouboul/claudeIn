import { describe, expect, it } from 'vitest';

import type { AskPrompt } from '@/components/Dashboard/AgentChat/askPrompt';
import { extractAuthInfo } from '@/components/Dashboard/AgentChat/AskPrompt/authInfo';

function choice(question: string, optionTexts: string[] = []): AskPrompt {
  return {
    type: 'choice',
    question,
    options: optionTexts.map((t, i) => ({ label: t, value: `v${i}` })),
  };
}

describe('extractAuthInfo', () => {
  it('pulls the MCP tool id from the question and derives the server', () => {
    const info = extractAuthInfo(
      choice('Approve mcp__claude_ai_Slack__slack_send_message ?'),
    );
    expect(info.toolId).toBe('mcp__claude_ai_Slack__slack_send_message');
    expect(info.server).toBe('slack');
  });

  it('falls back to scanning the option labels/values', () => {
    const info = extractAuthInfo(
      choice('Proceed?', ['Run mcp__github__create_issue', 'Cancel']),
    );
    expect(info.toolId).toBe('mcp__github__create_issue');
    expect(info.server).toBe('github');
  });

  it('returns nulls when no MCP tool id is present', () => {
    const info = extractAuthInfo(choice('Delete the file?'));
    expect(info.toolId).toBeNull();
    expect(info.server).toBeNull();
  });

  it('returns nulls for a text prompt', () => {
    const info = extractAuthInfo({ type: 'text', question: 'Name?' });
    expect(info.toolId).toBeNull();
    expect(info.server).toBeNull();
  });
});
