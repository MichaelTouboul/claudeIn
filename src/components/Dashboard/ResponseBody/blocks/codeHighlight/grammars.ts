/**
 * Per-language grammar config consumed by the homegrown tokenizer. A finite
 * value->behavior map (no fallback chains): each known language alias resolves
 * to one `Grammar`; an unknown alias resolves to `null` -> plain fallback.
 */
export interface Grammar {
  keywords: ReadonlySet<string>;
  /** Line-comment leaders, longest-first so `//` beats `/`. */
  lineComment: readonly string[];
  /** `true` for C-style `/* *\/` block comments. */
  blockComment: boolean;
  /** `true` to treat `name(` as a function-call token. */
  functionCalls: boolean;
}

const JS_KEYWORDS = [
  'function', 'const', 'let', 'var', 'for', 'return', 'if', 'else', 'while', 'new',
  'of', 'in', 'await', 'async', 'typeof', 'class', 'export', 'import', 'from',
  'default', 'extends', 'super', 'this', 'try', 'catch', 'finally', 'throw',
  'switch', 'case', 'break', 'continue', 'do', 'delete', 'void', 'yield',
  'interface', 'type', 'enum', 'implements', 'public', 'private', 'protected',
  'readonly', 'as', 'instanceof', 'null', 'undefined', 'true', 'false',
];

const PY_KEYWORDS = [
  'def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'is', 'not',
  'and', 'or', 'import', 'from', 'as', 'class', 'pass', 'break', 'continue',
  'with', 'lambda', 'try', 'except', 'finally', 'raise', 'yield', 'async',
  'await', 'global', 'nonlocal', 'del', 'assert', 'None', 'True', 'False', 'self',
];

const SH_KEYWORDS = [
  'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case',
  'esac', 'in', 'function', 'return', 'export', 'local', 'echo', 'cd', 'set',
  'unset', 'source', 'exit', 'read',
];

const CSS_KEYWORDS = ['important', 'from', 'to', 'and', 'not', 'only'];
const MD_KEYWORDS: string[] = [];

const js: Grammar = {
  keywords: new Set(JS_KEYWORDS),
  lineComment: ['//'],
  blockComment: true,
  functionCalls: true,
};
const python: Grammar = {
  keywords: new Set(PY_KEYWORDS),
  lineComment: ['#'],
  blockComment: false,
  functionCalls: true,
};
const shell: Grammar = {
  keywords: new Set(SH_KEYWORDS),
  lineComment: ['#'],
  blockComment: false,
  functionCalls: false,
};
const json: Grammar = {
  keywords: new Set(['true', 'false', 'null']),
  lineComment: [],
  blockComment: false,
  functionCalls: false,
};
const css: Grammar = {
  keywords: new Set(CSS_KEYWORDS),
  lineComment: [],
  blockComment: true,
  functionCalls: true,
};
const html: Grammar = {
  keywords: new Set([]),
  lineComment: [],
  blockComment: false,
  functionCalls: false,
};
const markdown: Grammar = {
  keywords: new Set(MD_KEYWORDS),
  lineComment: [],
  blockComment: false,
  functionCalls: false,
};

/** Language alias -> grammar. Anything absent here is "unknown" -> plain. */
const GRAMMARS: Record<string, Grammar> = {
  ts: js, tsx: js, typescript: js, js, jsx: js, javascript: js, mjs: js, cjs: js,
  python, py: python,
  bash: shell, sh: shell, shell, zsh: shell, console: shell,
  json,
  css,
  html, xml: html,
  md: markdown, markdown,
};

/** Resolve a (possibly null) language label to its grammar, or `null`. */
export function grammarFor(lang: string | null): Grammar | null {
  if (!lang) return null;
  return GRAMMARS[lang.trim().toLowerCase()] ?? null;
}
