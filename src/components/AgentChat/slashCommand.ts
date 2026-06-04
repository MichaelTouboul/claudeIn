/** A parsed Claude-Code slash-command transcript message. User-role transcript entries for a
 *  slash command are bundles of wrapper tags (no visible prose); this discriminated union is the
 *  cleaned-up shape `MessageRow` renders instead of the raw XML. */
export type SlashCommandMessage =
  | { kind: 'invocation'; name: string; args?: string }
  | { kind: 'output'; stream: 'stdout' | 'stderr'; text: string }
  | { kind: 'caveat' };

/** Matches a single `<tag>…</tag>` block, tolerating surrounding whitespace. `[\s\S]*?` is a
 *  non-greedy any-char (incl. newlines) capture of the inner text. */
function tagRe(tag: string): RegExp {
  return new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
}

const COMMAND_NAME_RE = tagRe('command-name');
const COMMAND_MESSAGE_RE = tagRe('command-message');
const COMMAND_ARGS_RE = tagRe('command-args');
const STDOUT_RE = tagRe('local-command-stdout');
const STDERR_RE = tagRe('local-command-stderr');
const CAVEAT_RE = tagRe('local-command-caveat');

/** All wrapper tags we know how to strip. Used to compute the "leftover" prose so we can
 *  distinguish a pure plumbing message from a normal user message that merely *quotes* a tag. */
const ALL_TAG_RES = [
  COMMAND_NAME_RE,
  COMMAND_MESSAGE_RE,
  COMMAND_ARGS_RE,
  STDOUT_RE,
  STDERR_RE,
  CAVEAT_RE,
];

/** Parses a user-role transcript message. Returns a cleaned `SlashCommandMessage` when the content
 *  is *purely* slash-command plumbing (only known wrapper-tag blocks, nothing else once stripped),
 *  or `null` for a normal user message — including the false-positive case where real prose merely
 *  quotes a wrapper tag inline. Pure: no DOM, no React, no side effects. */
export function parseSlashCommand(content: string): SlashCommandMessage | null {
  // Strip every known wrapper-tag block; if anything but whitespace remains, this is real prose.
  let leftover = content;
  for (const re of ALL_TAG_RES) {
    leftover = leftover.replace(new RegExp(re.source, 'g'), '');
  }
  if (leftover.trim().length > 0) return null;

  const nameMatch = COMMAND_NAME_RE.exec(content);
  if (nameMatch) {
    const name = nameMatch[1].trim();
    if (name.length === 0) return null;
    const argsMatch = COMMAND_ARGS_RE.exec(content);
    const args = argsMatch ? argsMatch[1].trim() : '';
    return args.length > 0 ? { kind: 'invocation', name, args } : { kind: 'invocation', name };
  }

  const stdoutMatch = STDOUT_RE.exec(content);
  if (stdoutMatch) return { kind: 'output', stream: 'stdout', text: stdoutMatch[1].trim() };

  const stderrMatch = STDERR_RE.exec(content);
  if (stderrMatch) return { kind: 'output', stream: 'stderr', text: stderrMatch[1].trim() };

  if (CAVEAT_RE.test(content)) return { kind: 'caveat' };

  return null;
}
