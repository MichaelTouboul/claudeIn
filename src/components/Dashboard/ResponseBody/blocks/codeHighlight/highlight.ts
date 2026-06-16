import { type Grammar, grammarFor } from './grammars';
import { type HighlightedLine, type Token, TokenType } from './types';

/**
 * Homegrown synchronous syntax highlighter. Chosen over Shiki/Prism: it is
 * dependency-free (zero added bundle weight), runs sync (no WASM/async init in
 * the Electron renderer), and covers the common languages well enough for chat
 * code blocks. Unknown languages degrade to plain mono (never crash).
 *
 * Returns one `HighlightedLine` per source line. The concatenation of every
 * token's text equals the input verbatim — highlighting is display-only and
 * must never mutate the source that Copy/transform read.
 */
export function highlight(code: string, lang: string | null): HighlightedLine[] {
  const grammar = grammarFor(lang);
  if (!grammar) return plainLines(code);
  return splitIntoLines(tokenize(code, grammar));
}

/** Unknown language: one plain token per line (empty line -> `[]`). */
function plainLines(code: string): HighlightedLine[] {
  return code.split('\n').map((line) => (line === '' ? [] : [{ type: TokenType.Plain, text: line }]));
}

/** Split a flat token stream on newlines into per-line token arrays. */
function splitIntoLines(tokens: Token[]): HighlightedLine[] {
  const lines: HighlightedLine[] = [[]];
  for (const tok of tokens) {
    const parts = tok.text.split('\n');
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part !== '') lines[lines.length - 1].push({ type: tok.type, text: part });
    });
  }
  return lines;
}

const IDENT = /[A-Za-z_$][\w$]*/y;
const NUMBER = /\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?/iy;

/** Greedy single-pass tokenizer driven by the language grammar. */
function tokenize(code: string, g: Grammar): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < code.length) {
    const ch = code[i];

    const comment = matchComment(code, i, g);
    if (comment) {
      out.push({ type: TokenType.Comment, text: comment });
      i += comment.length;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      const str = readString(code, i, ch);
      out.push({ type: TokenType.String, text: str });
      i += str.length;
      continue;
    }

    if (ch >= '0' && ch <= '9') {
      NUMBER.lastIndex = i;
      const m = NUMBER.exec(code);
      if (m) {
        out.push({ type: TokenType.Number, text: m[0] });
        i += m[0].length;
        continue;
      }
    }

    if (isIdentStart(ch)) {
      IDENT.lastIndex = i;
      const m = IDENT.exec(code);
      if (m) {
        out.push(identToken(m[0], code, i + m[0].length, g));
        i += m[0].length;
        continue;
      }
    }

    if (ch === '\n') {
      out.push({ type: TokenType.Plain, text: '\n' });
      i += 1;
      continue;
    }

    // Whitespace and punctuation runs stay plain (gutter/layout neutral).
    const run = readNeutral(code, i);
    out.push({ type: run.punct ? TokenType.Punctuation : TokenType.Plain, text: run.text });
    i += run.text.length;
  }
  return out;
}

function isIdentStart(ch: string): boolean {
  return /[A-Za-z_$]/.test(ch);
}

/** Keyword vs function-call vs plain identifier. */
function identToken(word: string, code: string, after: number, g: Grammar): Token {
  if (g.keywords.has(word)) return { type: TokenType.Keyword, text: word };
  if (g.functionCalls && nextNonSpaceIsCall(code, after)) {
    return { type: TokenType.Function, text: word };
  }
  return { type: TokenType.Plain, text: word };
}

/** Look past spaces (not newlines) for an opening paren -> function call. */
function nextNonSpaceIsCall(code: string, from: number): boolean {
  let j = from;
  while (j < code.length && (code[j] === ' ' || code[j] === '\t')) j += 1;
  return code[j] === '(';
}

/** Match the longest applicable line/block comment at `i`, or `null`. */
function matchComment(code: string, i: number, g: Grammar): string | null {
  if (g.blockComment && code.startsWith('/*', i)) {
    const end = code.indexOf('*/', i + 2);
    return end === -1 ? code.slice(i) : code.slice(i, end + 2);
  }
  for (const lead of g.lineComment) {
    if (code.startsWith(lead, i)) {
      const nl = code.indexOf('\n', i);
      return nl === -1 ? code.slice(i) : code.slice(i, nl);
    }
  }
  return null;
}

/** Read a quoted string with escapes, terminating at quote, newline, or EOF. */
function readString(code: string, i: number, quote: string): string {
  let j = i + 1;
  while (j < code.length) {
    const c = code[j];
    if (c === '\\') {
      j += 2;
      continue;
    }
    if (c === quote) return code.slice(i, j + 1);
    if (c === '\n' && quote !== '`') return code.slice(i, j);
    j += 1;
  }
  return code.slice(i);
}

const PUNCT = /[!-/:-@[-`{-~]/;

/** Read a contiguous run of whitespace OR a single punctuation char. */
function readNeutral(code: string, i: number): { text: string; punct: boolean } {
  const ch = code[i];
  if (ch === ' ' || ch === '\t' || ch === '\r') {
    let j = i;
    while (j < code.length && (code[j] === ' ' || code[j] === '\t' || code[j] === '\r')) j += 1;
    return { text: code.slice(i, j), punct: false };
  }
  if (PUNCT.test(ch)) return { text: ch, punct: true };
  return { text: ch, punct: false };
}
