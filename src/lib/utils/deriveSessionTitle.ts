// A slash-command invocation is stored as a raw XML-like envelope, e.g.
//   <command-message>loop</command-message><command-name>/loop</command-name>…
// That markup must never surface as a conversation title. We strip the
// `<command-*>…</command-*>` wrappers and surface the most readable inner text:
// the `/loop` command name when present, otherwise the remaining human text.

const COMMAND_NAME_RE = /<command-name>([\s\S]*?)<\/command-name>/i;
// Matches both paired `<command-foo>…</command-foo>` and stray `<command-foo>` /
// `</command-foo>` tags, keeping the inner text of paired ones.
const COMMAND_TAG_RE = /<\/?command-[a-z-]+>/gi;

// Only treat a prompt as a command envelope when it actually contains a
// `<command-*>` tag — plain text with stray `<` characters is left untouched.
const HAS_COMMAND_TAG_RE = /<command-[a-z-]+>/i;

export function sanitizeCommandEnvelope(text: string): string {
  if (!HAS_COMMAND_TAG_RE.test(text)) return text;

  const name = text.match(COMMAND_NAME_RE)?.[1]?.trim();
  if (name) return name;

  // No command name → strip every command wrapper, keep inner text, collapse
  // the whitespace left where tags used to be.
  return text.replace(COMMAND_TAG_RE, " ").replace(/\s+/g, " ").trim();
}

export type DeriveSessionTitleInput = {
  sessionId: string;
  title: string | null;
  firstPrompt: string | null;
  userTitle?: string | null;
  aiTitle?: string | null;
};

// Single source of truth for the sidebar/tab title resolution order:
// userTitle → aiTitle → session.title → sanitized(firstPrompt) → sessionId[0..8].
export function deriveSessionTitle(input: DeriveSessionTitleInput): string {
  const { sessionId, title, firstPrompt, userTitle, aiTitle } = input;

  const fromPrompt = firstPrompt ? sanitizeCommandEnvelope(firstPrompt) : "";

  return (
    userTitle ?? aiTitle ?? title ?? (fromPrompt || null) ?? sessionId.slice(0, 8)
  );
}
