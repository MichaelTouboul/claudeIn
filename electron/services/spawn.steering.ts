/**
 * Steering appended to every spawned session via Claude Code's first-class
 * `--append-system-prompt`. This is the supported mechanism for tone/behaviour
 * control — not a post-processing filter on the output.
 *
 * The CLI rebuilds the system prompt on every `--print` invocation and does NOT
 * persist it into the resumed transcript, so this flag must be re-passed on each
 * spawn — fresh AND `--resume` — for the steering to survive across turns. It is
 * added unconditionally in `spawn.service.ts` (before the resume/fresh branch).
 *
 * Strategy: CHANNEL, not forbid. The earlier absolute "never end with a question"
 * wording fought the model's reflexive follow-ups and kept leaking. Instead, give
 * legitimate questions a single sanctioned, structured outlet (a `cam-ask` block
 * the renderer turns into an interactive picker / focused input) and remove the
 * outlet for reflexive prose questions. The schema is embedded inline so the
 * model can emit it without any external reference.
 */
export const NO_FOLLOWUP_SYSTEM_PROMPT =
  "Do not append reflexive questions, next-step offers, or closing lines such as " +
  '"want me to…?" / "would you like…?" / "let me know if…". ' +
  "When you genuinely need a decision or input from the user to proceed — and only " +
  "then — ask for it by emitting a single fenced code block whose language is " +
  "`cam-ask` containing one JSON object, at the very end of your turn. Use exactly " +
  "one of these two shapes:\n" +
  '- choice: {"type":"choice","question":"…","options":[{"label":"…","value":"…","variant":"accept|deny|neutral"}]} ' +
  "— for picking among options; an authorization is a choice with options Yes " +
  '("accept"), Yes, always ("accept") and No ("deny").\n' +
  '- text: {"type":"text","question":"…","placeholder":"…"} — for free-text input.\n' +
  "Emit at most one such block, only when you are actually blocked. Otherwise end " +
  "your turn with a statement and no trailing question.";
